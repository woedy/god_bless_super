# SMS Sender Improvement Plan

This document captures the prioritized backlog for completing the SMS sender experience. Each user story lists acceptance criteria, automated testing requirements, and manual verification steps so we can deliver reliable, testable increments.

## Existing capabilities we must build upon
- The React dashboard already exposes core campaign tooling (`src/components/sms/BulkSMSForm.tsx`, `CampaignForm.tsx`, `MessageComposer.tsx`, and `RecipientSelector.tsx`). Bulk sending currently surfaces provider + template selection but lacks explicit SMTP, proxy, and delay controls.
- Delivery preferences persist through `sms_sender.models.CampaignDeliverySettings`, and campaign execution code (e.g., `sms_sender.routing_rules_engine`, `sms_sender.optimization_service`, `sms_sender.services.bulk_sender`) already computes proxy/SMTP rotation hints that we should respect.
- Campaign templates live in `sms_sender.campaign_templates` and are served through `smsService.getCampaignTemplates()` on the frontend. Email templates are exposed through the existing template service and linked automation flows under `sms_sender.tests.test_template_service`.
- Auto-optimization flows already exist: the frontend’s optimization center (`src/components/sms/OneClickOptimization.tsx`, `OptimizationDashboard.tsx`, and `pages/sms/OptimizationPage.tsx`) drives the `/api/sms/optimization/auto_optimize_campaign/` endpoint implemented in `sms_sender.api.optimization_views`/`sms_sender.optimization_service`. The “Quick Optimize” shortcut should stay wired to these services as we expand manual controls.
- Real-time progress and retry telemetry feed into `sms_sender.test_monitoring_service` and the WebSocket updates consumed by `useTaskMonitoring`.

All new work should extend these building blocks instead of introducing parallel systems.

## Priority 1 – Manual campaign configuration UI
- **User story:** As a campaign operator, I need an intuitive interface to configure SMTP accounts, proxy pools, delivery delays, and template rotations so I can launch a manual SMS campaign with confidence.
  - **Acceptance criteria:**
    - Extend `BulkSMSForm` (and `CampaignForm` where shared) to expose labeled inputs for selecting SMTP accounts sourced via `smsService.getSmtpAccounts()`, proxy pools from the proxy service, per-message delay ranges, and rotation cadence toggles that hydrate/modify `CampaignDeliverySettings`.
    - Users can select from available SMS optimization templates (existing preview cards in `MessageComposer`), and the form surfaces template metadata such as throttling hints defined in `campaign_templates.py`.
    - Form validation covers required fields, malformed delays, and unavailable proxies/SMTP accounts with actionable error messages surfaced inline and propagated to the existing toast notifier.
    - Submitted configurations persist to the campaign record (`/api/sms/campaigns/` endpoints) and hydrate existing campaigns by pre-populating `BulkSMSForm` from the stored `delivery_settings` relationship.
    - Surface automation controls alongside the manual inputs so operators can trigger One-Click/auto optimization or Quick Optimize from the campaign form, and ensure the returned recommendations sync the same `CampaignDeliverySettings` instance.
  - **Automated tests:** Add frontend component tests under `src/services/__tests__/sms` or `src/components/sms/__tests__` asserting form validation, template selection, and that save events call `smsService.updateCampaignDeliverySettings`. Add backend controller tests around `sms_sender.api.views` (or serializers) ensuring payloads are validated against `CampaignDeliverySettings` constraints and saved correctly.
  - **Manual verification:** From the dashboard, open the bulk sender, configure SMTP/proxy/delay/template settings, save, refresh the page, and confirm the values reload. Attempt invalid inputs to confirm inline validation, and verify persisted settings in the Django admin or via the campaign detail API. Run One-Click/Quick Optimize from the same screen and confirm the auto-applied values update the stored delivery settings instead of creating duplicates.

## Priority 2 – Campaign execution & scheduling reliability
- **User story:** As a campaign manager, I want queued SMS jobs to respect shared rate limits, proxy availability, and SMTP rotation so multi-worker deliveries stay consistent and recover from throttling.
  - **Acceptance criteria:**
    - Delivery tasks leverage a distributed scheduler (Redis or equivalent) so Celery workers delegate rate limiting/delay management instead of using the current `time.sleep` calls in `sms_sender.tasks.bulk_send_sms`.
    - SMTP accounts rotate according to `CampaignDeliverySettings.smtp_rotation_strategy`; exhausted accounts trigger fallback logic surfaced via `ServerUsageLog` entries and the monitoring channel.
    - Proxy assignments apply per message via the `routing_rules_engine` helpers, and unavailable proxies trigger retries using the existing rotation strategies without losing the job.
    - Delivery status updates (queued → sending → delivered/failed) flow through the WebSocket monitoring channel consumed by `useTaskMonitoring`, including timestamps and error details captured on `SMSMessage`.
  - **Automated tests:** Implement Celery task integration tests (e.g., `sms_sender/tests/test_campaign_execution.py`) covering rate-limit enforcement, proxy fallback, and SMTP rotation under concurrent worker scenarios by stubbing the scheduler. Add unit tests for scheduling utilities introduced in `sms_sender/services` to ensure delay calculations honor `CampaignDeliverySettings`.
  - **Manual verification:** Launch a campaign with multiple SMTP accounts and proxies, observe real-time progress in the monitoring dashboard, and confirm throttled messages are retried and eventually delivered.

## Priority 3 – Optimization template and automation alignment
- **User story:** As an automation specialist, I need reusable optimization templates and quick automation paths that preconfigure throttling, rotation, and personalization settings so campaigns launch faster and stay compliant.
  - **Acceptance criteria:**
    - Templates extend the existing `CampaignTemplate` model/service so throttle strategy, delay windows, proxy pools, and message personalization tokens persist and serialize through `smsService.getCampaignTemplates()`.
    - The UI lists available templates using the existing card grid in `MessageComposer` and introduces filtering by channel (SMS/email) with key settings (e.g., rotation flags, delay ranges) surfaced in the preview.
    - Selecting a template auto-populates the campaign form and locks fields flagged as non-editable by the template definition, integrating with the new configuration controls added to `BulkSMSForm`.
    - Auto optimization (One-Click) and Quick Optimize paths reuse these template defaults: trigger responses from `optimization_service.auto_optimize_campaign` should map to template-backed presets, and Quick Optimize buttons in `OptimizationPage.tsx`/`OneClickOptimization.tsx` must respect template-locked fields when applying updates.
    - Administrators can create, update, and archive templates via the existing template administration endpoints, with changes reflected in `CampaignForm` drafts and automation dashboards without breaking saved custom overrides.
  - **Automated tests:** Add backend tests for the template CRUD API (e.g., `sms_sender/tests/test_templates_api.py`) and frontend tests ensuring template selection populates fields and respects edit locks via the shared `MessageComposer` component. Add integration coverage verifying auto/quick optimization responses merge correctly with template constraints in the campaign form state.
  - **Manual verification:** Create a new optimization template, trigger One-Click optimization on a campaign seeded with that template, confirm the recommendations honor locked fields, and ensure archived templates disappear from selection lists while Quick Optimize still surfaces valid options.

## Priority 4 – Email template wiring and cross-channel parity
- **User story:** As a marketing strategist, I want SMS campaigns to optionally pair with email templates so multi-channel outreach stays coordinated.
  - **Acceptance criteria:**
    - Campaign records reference an email template through the existing template linkage used in `sms_sender.test_template_service`; the UI allows linking/unlinking with previews sourced from the email template API.
    - When email templates change, linked campaigns reflect the latest version while preserving SMS-specific overrides by leveraging the template revision helpers already covered in `test_template_service`.
    - Automation workflows trigger both SMS and email deliveries when configured, using shared scheduling rules to avoid channel collisions and reusing the distributed scheduler introduced in Priority 2.
    - Audit logs capture when email templates are attached, modified, or detached from campaigns, augmenting the `ServerUsageLog`/audit trail utilities already present in the SMS sender app.
  - **Automated tests:** Extend automation flow tests (e.g., `sms_sender/tests/test_multichannel_workflow.py`) to assert coordinated SMS+email execution and audit logging. Add frontend tests verifying email template previews and link/unlink actions via the campaign detail drawer.
  - **Manual verification:** Link an email template to an SMS campaign, trigger the automation workflow, and confirm both channels deliver while respecting configured delays. Review audit logs for accurate change history.

---

Complete each story sequentially to maintain a testable, incrementally deployable path toward a polished SMS sender experience.
