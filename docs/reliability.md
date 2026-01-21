Reliability improvements added

Overview
- Added optional Sentry integration for error monitoring. Set the environment variable `SENTRY_DSN` in production to enable it. You can also set `SENTRY_TRACES_SAMPLE_RATE` and `SENTRY_SEND_PII`.
- Added a public health endpoint at `/api/healthz/` that checks DB and cache availability and returns JSON with basic status information.

How to enable Sentry
1. Create a Sentry project and obtain the DSN.
2. Set the DSN in your environment (e.g., `SENTRY_DSN=https://...`), and optionally set `SENTRY_TRACES_SAMPLE_RATE` (default 0.0) and `SENTRY_SEND_PII=true` if you want to send PII.
3. Restart the application. The app will attempt to initialize Sentry during settings import but will not fail if initialization fails.

Enabling health-check notifications
- Set `HEALTHCHECK_URL` in GitHub repository secrets to your health endpoint (e.g., `https://your-domain.example.com/api/healthz/`).
- Optionally set `SLACK_WEBHOOK` to a Slack incoming webhook URL and the health-check workflow will post a short alert if a check fails.

See `docs/ops.md` for an operational checklist with validation steps and minimal safety guidance.

Health endpoint
- URL: `/api/healthz/`
- Response: JSON with keys `status`, `db`, `cache`. `status` is `ok` when all checks pass and `fail` otherwise.
- Use this endpoint with uptime monitors or load balancer health checks.

Next recommendations
- Add Sentry release tagging in CI for better error grouping.
  - The CI step is inert unless you set the required GitHub secrets: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT`.
  - Once set, the CI will create a Sentry release named after the commit (`${{ github.sha }}`) to associate errors with a code revision.
- Wire Sentry DSN into your deployment pipeline secrets (Render/GCP/AWS/Heroku) so production errors are captured.
- Add a scheduled CI job (GitHub Actions) that hits `/api/healthz/` for uptime testing and alerts on failure.

How to enable Sentry release tagging
1. Add the following repository secrets in GitHub: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` and optionally `SENTRY_DSN` for runtime.
2. The workflow will then create a release using the commit SHA and Sentry will link errors to that release.
3. Optionally add `SENTRY_RELEASE` and `SENTRY_ENVIRONMENT` environment variables for additional context.

Automated health-check workflow
- File: `.github/workflows/health-check.yml`
- Behavior: runs daily (and on-demand via workflow dispatch) but **does nothing** until the repository secret `HEALTHCHECK_URL` is set. The job exits early (success) if the secret is missing so it is safe to keep committed in your repo.
- To enable: go to your repository Settings → Secrets → Actions → New repository secret and add `HEALTHCHECK_URL` with a value like `https://your-domain.example.com/api/healthz/`.

Notes
- The workflow fails the job (and therefore marks the run as failed) if the health endpoint returns a non-200 status, giving you visible alerts in the Actions UI to investigate.

Feedback & real-time alerts
- A minimal feedback API is available at `POST /api/feedback/` (any user; authenticated optional). Payload: `{"rating": <1-5>, "comment": "optional"}`.
- Admins can view recent feedback via `GET /api/feedback/` (admin-only).
- To enable real-time alerts, set the environment variable `FEEDBACK_WEBHOOK_URL` to your webhook receiver URL (Slack/Discord/HTTP). The server will POST a small JSON payload to that URL when new feedback is received; failures are best-effort and do not affect the API response.

Privacy & safety notes
- The webhook payload intentionally contains **minimal data** (rating, comment, user_id if present, created_at) to reduce PII exposure. No username or email is included by default.
- Webhooks can be signed by setting `FEEDBACK_WEBHOOK_SECRET`; the server will add an `X-Feedback-Signature` header (HMAC-SHA256) so receivers can verify authenticity.
- Feedback submission is **rate-limited** (default 10/hour per user or IP) to avoid spam.
- Comments are limited to 1000 characters and are trimmed to that length server-side.
- Webhook failures are retried a few times in the background and are reported to Sentry if configured; failures do not block or crash the API.
