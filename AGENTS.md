# Agent Implementation Guide

This document captures the canonical list of improvements we have agreed to implement for the OSINT simulation platform. Any future contribution must comply with the conventions and priorities stated here.

## Core initiatives

1. **Phone number generation integrity**
   - Scope auto-validation strictly to numbers produced by the triggering generation task.
   - Ensure generation metrics reflect the count of rows actually persisted after deduplication.
   - Provide precise, user-visible progress updates throughout generation and validation tasks.

2. **Phone validation efficiency**
   - Minimize redundant prefix lookups during validation runs by caching or prefetching.
   - Preserve functional parity while reducing database load and execution time.

3. **SMS delivery reliability**
   - Complete the SMS sender implementation so campaigns progress from queued to delivered states.
   - Replace blocking, in-memory throttling with a distributed-safe scheduler that plays well with multiple Celery workers.
   - Add comprehensive tests and monitoring hooks to confirm real-time delivery reporting.
   - Verify SMTP account rotation, proxy usage, and configurable delivery delays operate as expected across automated services.
   - Follow the prioritized sprint backlog in `SMS_IMPROVEMENT.md` when planning or reviewing SMS-related work.

4. **Real-time task monitoring**
   - Expose accurate progress indicators for background tasks in both backend APIs and frontend WebSocket updates.
   - Guarantee that users can observe initiation, ongoing progress, completion, and failure states without manual refreshes.

## Contribution principles

- Changes must keep production deployments stable; flag any modification that could affect live configuration for explicit review before merging.
- Every implemented task requires automated test coverage and companion manual verification steps documented in the relevant pull request.
- Prefer incremental, well-documented commits tied to the user stories enumerated in `IMPROVEMENTS.md`.
- Respect existing code style and refrain from introducing breaking API changes unless coordinated beforehand.

Developers should consult this document before beginning work and update it only when strategic priorities change.

## Current sprint focus

- For SMS sender enhancements, reference `SMS_IMPROVEMENT.md` for the agreed user stories, acceptance criteria, and verification requirements. That backlog now documents the existing components (e.g., `BulkSMSForm`, `CampaignDeliverySettings`, routing/optimization services) that new work must extend rather than replace.
- Keep the manual SMS configuration UI intuitive: align field naming with the new task list, reuse the established `smsService` APIs for SMTP/proxy/template data, and document any UX decisions within the relevant pull requests.
- Preserve the automation pathways we already expose: hook new manual controls into the One-Click/Quick Optimize flows implemented in `src/components/sms/OneClickOptimization.tsx`, `OptimizationDashboard.tsx`, and `sms_sender.optimization_service.auto_optimize_campaign` instead of rebuilding them.
