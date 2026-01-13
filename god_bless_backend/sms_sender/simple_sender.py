"""
Simple SMS sender service
Provides single and bulk sending flows without exposing campaign complexity to callers.
"""
from __future__ import annotations

import logging
from typing import Dict, List, Any

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import SMSCampaign, SMSMessage, CampaignDeliverySettings
from .macro_processor import macro_processor
from .rotation_manager import RotationManager
from .tasks import process_sms_campaign_task, send_enhanced_sms_message_simple

logger = logging.getLogger(__name__)


class SimpleSMSSender:
    """High-level orchestrator for ad-hoc single and bulk SMS sends."""

    MASS_SEND_LIMIT = 5000

    def __init__(self, user):
        self.user = user

    def send_single(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Send a single SMS synchronously."""
        recipient = payload["recipient"]
        campaign = self._create_campaign(
            payload=payload,
            recipient_count=1,
            mode="single",
        )
        self._create_messages(
            campaign,
            recipients=[recipient],
            message_template=payload["message_template"],
            custom_macros=payload.get("custom_macros") or {},
            provider=payload.get("provider"),
        )

        message = campaign.messages.order_by("id").first()
        if not message:
            raise ValidationError({"recipients": ["Unable to create message record."]})

        rotation_manager = RotationManager(self.user, campaign)
        smtp = rotation_manager.get_next_smtp()
        if not smtp:
            campaign.status = "failed"
            campaign.messages_failed = 1
            campaign.completed_at = timezone.now()
            campaign.save(update_fields=["status", "messages_failed", "completed_at"])
            raise ValidationError(
                {"smtp": ["No active SMTP servers are available for this user."]}
            )

        proxy = rotation_manager.get_next_proxy()
        delay_applied = rotation_manager.apply_delivery_delay()

        try:
            success = send_enhanced_sms_message_simple(
                message=message,
                smtp=smtp,
                proxy=proxy,
                campaign=campaign,
                rotation_manager=rotation_manager,
                delay_applied=delay_applied or 0,
            )
        except Exception as exc:  # pragma: no cover - defensive logging
            logger.exception("Single SMS send failed for campaign %s", campaign.id)
            campaign.status = "failed"
            campaign.messages_failed = 1
            campaign.completed_at = timezone.now()
            campaign.error_message = str(exc)
            campaign.save(
                update_fields=["status", "messages_failed", "completed_at", "error_message"]
            )
            raise

        campaign.status = "completed" if success else "failed"
        campaign.messages_sent = 1 if success else 0
        campaign.messages_failed = 0 if success else 1
        campaign.progress = 100
        campaign.completed_at = timezone.now()
        campaign.save(
            update_fields=[
                "status",
                "messages_sent",
                "messages_failed",
                "progress",
                "completed_at",
            ]
        )

        return {
            "campaign_id": campaign.id,
            "message_id": message.id,
            "delivery_status": message.delivery_status,
            "sent_at": message.sent_at,
        }

    def send_bulk(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Queue a background bulk send task."""
        recipients = payload["recipients"]
        unique_recipients, dedup_count = self._deduplicate_recipients(recipients)

        if not unique_recipients:
            raise ValidationError({"recipients": ["No valid recipients supplied."]})

        if len(unique_recipients) > self.MASS_SEND_LIMIT:
            raise ValidationError(
                {
                    "recipients": [
                        f"Bulk sends are limited to {self.MASS_SEND_LIMIT} recipients per request."
                    ]
                }
            )

        campaign = self._create_campaign(
            payload=payload,
            recipient_count=len(unique_recipients),
            mode="bulk",
        )
        self._create_messages(
            campaign,
            recipients=unique_recipients,
            message_template=payload["message_template"],
            custom_macros=payload.get("custom_macros") or {},
            provider=payload.get("provider"),
        )

        task = process_sms_campaign_task.delay(campaign.id)
        campaign.celery_task_id = task.id
        campaign.save(update_fields=["celery_task_id"])

        return {
            "campaign_id": campaign.id,
            "task_id": task.id,
            "total_recipients": len(unique_recipients),
            "removed_duplicates": dedup_count,
        }

    def _create_campaign(
        self,
        payload: Dict[str, Any],
        recipient_count: int,
        mode: str,
    ) -> SMSCampaign:
        subject = payload.get("subject") or ""
        campaign_name = (
            subject.strip()
            if subject.strip()
            else f"{mode.title()} send {timezone.now().isoformat(timespec='seconds')}"
        )

        delivery_settings = payload["delivery_settings"]
        defaults = self._delivery_settings_defaults(delivery_settings)

        with transaction.atomic():
            campaign = SMSCampaign.objects.create(
                user=self.user,
                name=campaign_name[:200],
                description=payload.get(
                    "description",
                    f"Ad-hoc {mode} SMS triggered by {self.user}",
                )[:500],
                message_template=payload["message_template"],
                custom_macros=payload.get("custom_macros") or {},
                sender_name=payload.get("sender_name", "SMS")[:100],
                email_subject=payload.get("subject", "SMS")[:200],
                target_carrier=payload.get("provider") or "",
                send_immediately=True,
                batch_size=min(max(recipient_count, 1), 1000),
                rate_limit=payload.get("rate_limit", 10),
                use_proxy_rotation=defaults["use_proxy_rotation"],
                use_smtp_rotation=defaults["use_smtp_rotation"],
                total_recipients=recipient_count,
                status="draft",
            )

            CampaignDeliverySettings.objects.update_or_create(
                campaign=campaign,
                defaults=defaults,
            )

        return campaign

    def _delivery_settings_defaults(self, delivery_settings: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "use_proxy_rotation": delivery_settings.get("use_proxy_rotation", True),
            "proxy_rotation_strategy": delivery_settings.get("proxy_rotation_strategy", "round_robin"),
            "use_smtp_rotation": delivery_settings.get("use_smtp_rotation", True),
            "smtp_rotation_strategy": delivery_settings.get("smtp_rotation_strategy", "round_robin"),
            "custom_delay_enabled": delivery_settings.get("custom_delay_enabled", False),
            "custom_delay_min": delivery_settings.get("custom_delay_min", 1),
            "custom_delay_max": delivery_settings.get("custom_delay_max", 5),
            "custom_random_seed": delivery_settings.get("custom_random_seed"),
            "selected_proxy_ids": delivery_settings.get("selected_proxy_ids") or [],
            "selected_smtp_account_ids": delivery_settings.get("selected_smtp_account_ids") or [],
            "adaptive_optimization_enabled": delivery_settings.get("adaptive_optimization_enabled", False),
            "carrier_optimization_enabled": delivery_settings.get("carrier_optimization_enabled", False),
            "timezone_optimization_enabled": delivery_settings.get("timezone_optimization_enabled", False),
            "applied_template_id": delivery_settings.get("applied_template_id"),
        }

    def _create_messages(
        self,
        campaign: SMSCampaign,
        recipients: List[Dict[str, Any]],
        message_template: str,
        custom_macros: Dict[str, Any],
        provider: str | None,
    ) -> List[SMSMessage]:
        messages: List[SMSMessage] = []

        for recipient in recipients:
            recipient_data = recipient.get("data") or {}
            processed_message = macro_processor.process_message(
                message_template,
                custom_macros,
                recipient_data,
            )

            messages.append(
                SMSMessage(
                    campaign=campaign,
                    phone_number=recipient["phone_number"].strip(),
                    carrier=recipient.get("carrier") or provider or "",
                    message_content=processed_message,
                    recipient_data=recipient_data,
                    delivery_status="pending",
                )
            )

        SMSMessage.objects.bulk_create(messages)
        return list(campaign.messages.order_by("id")[: len(messages)])

    def _deduplicate_recipients(
        self, recipients: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], int]:
        unique = {}
        for recipient in recipients:
            phone = recipient.get("phone_number", "").strip()
            if not phone:
                continue
            normalized = phone.replace(" ", "")
            if normalized not in unique:
                unique[normalized] = recipient

        deduped = list(unique.values())
        removed = max(len(recipients) - len(deduped), 0)
        return deduped, removed
