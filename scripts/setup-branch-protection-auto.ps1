# PowerShell: Fully automated branch protection setup for Windows
# Usage: ./scripts/setup-branch-protection-auto.ps1 [-Repo owner/repo]
Param(
  [string]$Repo = $null
)

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Error "GitHub CLI (gh) is required. Install from https://cli.github.com/"
  exit 1
}

try {
  gh auth status | Out-Null
} catch {
  Write-Error "gh is not authenticated. Run: gh auth login"
  exit 1
}

if ($Repo) {
  $ownerRepo = $Repo
} else {
  try {
    $origin = git remote get-url origin 2>$null
  } catch {
    $origin = $null
  }
  if (-not $origin) {
    Write-Error "Could not detect git remote. Run from a clone or pass -Repo 'owner/repo'"
    exit 1
  }
  if ($origin -match '[:/]([^/]+/[^/]+)(\.git)?$') { $ownerRepo = $Matches[1] }
}

Write-Host "Repository: $ownerRepo"
Write-Host "Applying branch protection to 'main' (no prompt)..."

# Execute gh api call (no prompt)
gh api -X PUT "/repos/$ownerRepo/branches/main/protection" `
  -f required_status_checks.strict=true `
  -f required_status_checks.contexts='["Ops Preflight"]' `
  -f required_pull_request_reviews.required_approving_review_count=1 `
  -f required_pull_request_reviews.dismiss_stale_reviews=true `
  -f enforce_admins=true

Write-Host "Branch protection applied. Verify Settings → Branches → Branch protection rules."
Write-Host "Press Enter to exit."
[void][System.Console]::ReadLine()
