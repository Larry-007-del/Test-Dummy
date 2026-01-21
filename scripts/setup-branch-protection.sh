#!/usr/bin/env bash
set -euo pipefail

# Simple helper to set branch protection on main to require the Ops Preflight check
# Usage: ./scripts/setup-branch-protection.sh [owner/repo]

if ! command -v gh >/dev/null 2>&1; then
  echo "ERROR: GitHub CLI (gh) is required. Install from https://cli.github.com/"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "ERROR: gh is not authenticated. Run: gh auth login"
  exit 1
fi

REPO_ARG=${1:-}
if [ -n "$REPO_ARG" ]; then
  OWNER_REPO="$REPO_ARG"
else
  ORIGIN_URL=$(git remote get-url origin 2>/dev/null || true)
  if [ -z "$ORIGIN_URL" ]; then
    echo "ERROR: Could not detect git remote. Please run this from a cloned repo or pass owner/repo as the first argument." 
    echo "Example: ./scripts/setup-branch-protection.sh octocat/hello-world"
    exit 1
  fi
  # Normalize origin URL to owner/repo
  if [[ "$ORIGIN_URL" == git@* ]]; then
    OWNER_REPO=$(echo "$ORIGIN_URL" | sed -E 's/.*[:/]([^/]+\/[^/]+)(\.git)?/\1/')
  else
    OWNER_REPO=$(echo "$ORIGIN_URL" | sed -E 's#https?://[^/]+/##; s#(.+)\.git$#\1#')
  fi
fi

echo "Repository: $OWNER_REPO"
echo "This will set branch protection on 'main' to require the status check 'Ops Preflight', require 1 approving review, dismiss stale reviews, and enforce admin restrictions."
read -p "Proceed? (y/N): " -r PROCEED
PROCEED=${PROCEED:-N}
if [[ "$PROCEED" != "y" && "$PROCEED" != "Y" ]]; then
  echo "Aborted by user. No changes made."
  exit 0
fi

# Apply protection using gh api
# We use explicit fields; gh will prompt if authorization is missing.
set -x
gh api -X PUT "/repos/$OWNER_REPO/branches/main/protection" \
  -f required_status_checks.strict=true \
  -f required_status_checks.contexts='["Ops Preflight"]' \
  -f required_pull_request_reviews.required_approving_review_count=1 \
  -f required_pull_request_reviews.dismiss_stale_reviews=true \
  -f enforce_admins=true
set +x

echo "Branch protection applied. Verify in repository Settings → Branches → Branch protection rules."
echo "Press Enter to exit."
read