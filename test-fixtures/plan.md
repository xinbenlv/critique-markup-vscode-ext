# LLM Plan: Notifications Refactor

## Goal

Move notification delivery from the request path into a background worker so checkout stays responsive under peak load.

## Proposed changes

1. Add a durable `notification_jobs` table with status, retry count, and provider response metadata.
2. In the checkout flow, enqueue jobs after the order transaction commits.
3. Run a worker that sends email and SMS notifications with exponential backoff.
4. {==Rollout strategy==}{>>This needs an explicit canary phase and rollback trigger before production traffic moves over.<<}
5. Remove {--the legacy synchronous sender immediately after deploy--} from the API path.

## Review notes

- {==Queue migration plan==}{>>Please include how existing pending notifications are backfilled without duplicates.<<}
- {--Skip idempotency keys for now because retries should be rare.--}
- Track latency, queue depth, and provider failure rate in the release dashboard.
