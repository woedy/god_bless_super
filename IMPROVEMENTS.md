# Improvement Roadmap

This checklist captures the planned enhancements for the OSINT simulation platform. Each user story includes acceptance criteria, automated testing requirements, and manual verification steps to execute once the work is complete.

## Phone number generation integrity

- [ ] **User story:** As an intelligence analyst, I want auto-validation to target only the numbers produced in my current generation run so I can trust the results.
  - **Acceptance criteria:**
    - Auto-validation jobs receive an explicit list of generated record IDs instead of relying on date-based filters.
    - No phone numbers generated earlier in the same day are re-validated.
    - Background progress events expose start, incremental updates, and completion for the generation and follow-up validation tasks.
  - **Automated tests:** Extend `phone_generator/test_api.py` (or equivalent) to cover overlapping generation runs and assert only the intended numbers are validated.
  - **Manual verification:** Trigger two overlapping generation jobs via the UI, observe distinct progress traces, and confirm only the expected records are validated.

- [ ] **User story:** As a platform operator, I need generation metrics to reflect actual inserts after deduplication so reporting dashboards stay accurate.
  - **Acceptance criteria:**
    - `result_data` and API responses report the true count of persisted numbers even when duplicates are ignored.
    - Progress indicators remain monotonic and finish at 100% when the job completes.
  - **Automated tests:** Add coverage in `phone_generator/test_models.py` (or equivalent) that seeds duplicates and verifies the reported counts match the database.
  - **Manual verification:** Generate a batch containing known duplicates and confirm the reported totals match the numbers visible in the admin UI or database.

## Phone validation efficiency

- [ ] **User story:** As a validation engineer, I want validation runs to scale without excessive database chatter so large jobs finish within expected SLAs.
  - **Acceptance criteria:**
    - Prefix lookups are cached or prefetched, reducing per-record queries to at most one per unique prefix.
    - Validation throughput improves measurably on datasets with repeated prefixes.
    - Progress updates continue to stream while validation is running.
  - **Automated tests:** Introduce a test (e.g., `phone_generator/tests.py`) asserting the query count drops when validating numbers with repeated prefixes.
  - **Manual verification:** Validate a dataset with many identical prefixes and compare runtime and database load before and after the change.

## SMS delivery reliability

- [ ] **User story:** As a campaign manager, I need the SMS sender to progress messages from queued to delivered while honoring rate limits across workers.
  - **Acceptance criteria:**
    - Rate limiting uses a shared store (e.g., Redis) and never blocks worker threads with `sleep`.
    - Campaign tasks reschedule messages when throttled, and status updates propagate in real time.
    - Delivery outcomes and errors are visible in the monitoring UI/WebSocket feed.
  - **Automated tests:** Add integration coverage in `sms_sender/test_retry_integration.py` (or similar) to simulate competing workers and ensure rate limits are enforced without duplicates.
  - **Manual verification:** Launch a campaign spanning multiple carriers, watch the live dashboard for progress, and confirm throttled messages eventually deliver.

- [ ] **User story:** As an operations engineer, I need SMTP rotations, proxy routing, and delivery delay tuning to function automatically so large-scale outreach stays compliant and reliable.
  - **Acceptance criteria:**
    - SMTP pool management rotates sender accounts according to configuration and surfaces failures through monitoring.
    - Proxy assignments are respected for outbound requests, with fallbacks documented and observable.
    - Configurable delivery delays (per carrier or campaign) are enforced without stalling unrelated tasks.
    - Automation workflows (including scheduled SMS/email sends) read from a single source of truth for throttling and routing.
  - **Automated tests:** Extend `sms_sender/test_automation.py` (or equivalent) to cover SMTP rotation logic, proxy selection, and delay scheduling under concurrent load.
  - **Manual verification:** Execute a mixed SMS/email campaign with multiple SMTP accounts and proxies, confirm rotations via logs/metrics, and validate that configured delays match observed send timings.

## Real-time task monitoring

- [ ] **User story:** As a trainee, I want accurate progress bars for long-running tasks so I can tell when my requests finish without refreshing.
  - **Acceptance criteria:**
    - Backend tasks emit structured progress updates at key milestones (start, periodic increments, completion, failure).
    - Frontend components consume these updates to animate progress indicators without stalling at 0%.
    - A real-time task history view reflects the final status of each job.
  - **Automated tests:** Implement backend tests verifying progress payloads and frontend unit/integration tests ensuring progress bars respond to simulated WebSocket events.
  - **Manual verification:** Start generation, validation, and SMS tasks from the UI and confirm the progress indicators advance smoothly to completion.

---

Update this checklist as tasks are completed. Each checked item must link to the verifying tests and manual QA evidence in its associated pull request.
