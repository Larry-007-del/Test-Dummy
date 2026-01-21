Operational checklist — Monitoring & Health Checks

Quick steps to enable monitoring and notifications (workable, low-risk):

1) Set runtime & CI secrets
- In GitHub repository Settings → Secrets → Actions add:
  - `SENTRY_DSN` (runtime) — optional, enable Sentry error capture in production.
  - `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` — used by CI to create a Sentry release (optional).
  - `HEALTHCHECK_URL` — set to your deployed health endpoint, e.g. `https://your-domain.example.com/api/healthz/`.
  - `FEEDBACK_WEBHOOK_URL` and optionally `FEEDBACK_WEBHOOK_SECRET` — to enable feedback real-time alerts.
  - `SLACK_WEBHOOK` — optional: used by the health-check workflow to notify Slack when health-check fails.

2) What changes we made (already in repo)
- `GET /api/healthz/` — public health check (checks DB & cache) in `attendance/health.py`.
- `.github/workflows/health-check.yml` — scheduled (daily) workflow that runs the health check; inert until `HEALTHCHECK_URL` is set.
- `backend-ci.yml` — CI exposes `SENTRY_RELEASE=${{ github.sha }}` and will create a Sentry release when `SENTRY_AUTH_TOKEN` is configured.
- Optional Slack notify: health-check workflow will POST to `SLACK_WEBHOOK` on failure (if set).

3) Validation & smoke tests
- Quick local test (replace with your domain):
  curl -i https://your-domain.example.com/api/healthz/
- After setting `HEALTHCHECK_URL` secret, run the workflow manually from the Actions UI (Workflow → Run workflow) to validate notification and behavior.
- Run the preflight checks (Workflow → Ops Preflight → Run workflow). This will validate that `SECRET_KEY` and `HEALTHCHECK_URL` are set and run Django system checks (this step will fail if serious issues are detected).
- The Ops Preflight workflow also runs automatically for pull requests targeting `main` so issues can be caught during code review.

Quick, foolproof branch-protection helper
- If you want to **require the Ops Preflight check** before merges to `main`, run one of the helper scripts included in `scripts/`:
  - Bash (Linux/macOS): `./scripts/setup-branch-protection.sh [owner/repo]`
  - PowerShell (Windows): `./scripts/setup-branch-protection.ps1 -Repo owner/repo`
- The scripts verify `gh` is installed and authenticated, confirm the repository, prompt for confirmation, and then set the branch protection rule to:
  - require status check context: `Ops Preflight`
  - require at least 1 approving review and dismiss stale reviews
  - enforce admin restrictions

Notes
- These scripts use the GitHub CLI (`gh`) and will fail with a helpful message if `gh` is not present or not logged in.
- You can always perform the same steps manually via GitHub: Repository → Settings → Branches → Add rule → select the "Ops Preflight" check under "Require status checks to pass before merging".

4) Minimal safety guidance
- `FEEDBACK_WEBHOOK_URL` receives minimal payload (rating, truncated comment, user_id, created_at). No username/email by default.
- Use `FEEDBACK_WEBHOOK_SECRET` so the server can add an HMAC signature header; validate the `X-Feedback-Signature` on the receiver.
- Keep `DEBUG=False` and set `SECRET_KEY` in production secrets before going public.

5) Next optional steps (when ready)
- Add more sophisticated alerting (PagerDuty, Opsgenie) to the health-check workflow.
- Upload source maps / sourcemaps for mobile/web to Sentry for better stack traces.
- Use a queued delivery system for webhooks (Celery/RQ) for higher reliability at scale.
