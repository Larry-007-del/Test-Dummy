Param(
  [string]$Repo = $null
)

# PowerShell helper for Windows users to set a branch protection rule using gh
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
Write-Host "This will set branch protection on 'main' to require the status check 'Ops Preflight', require 1 approving review, dismiss stale reviews, and enforce admin restrictions."
$ok = Read-Host "Proceed? (y/N)"
if ($ok -ne 'y' -and $ok -ne 'Y') { Write-Host 'Aborted by user.'; exit 0 }

# Execute gh api call
gh api -X PUT "/repos/$ownerRepo/branches/main/protection" `
  -f required_status_checks.strict=true `
  -f required_status_checks.contexts='["Ops Preflight"]' `
  -f required_pull_request_reviews.required_approving_review_count=1 `
  -f required_pull_request_reviews.dismiss_stale_reviews=true `
  -f enforce_admins=true

Write-Host "Branch protection applied. Verify Settings → Branches → Branch protection rules."