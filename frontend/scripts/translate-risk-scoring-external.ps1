# Run in Windows Terminal (outside Cursor) to avoid IDE tool timeouts.
# From repo:  powershell -ExecutionPolicy Bypass -File frontend/scripts/translate-risk-scoring-external.ps1
$ErrorActionPreference = "Stop"
$frontend = Join-Path $PSScriptRoot ".."
Set-Location $frontend

# Non-en, non-tr pack locales; edit to only the ones you need:
$locales = @("ar", "ru", "de", "fr", "es", "zh", "ja", "ko", "hi", "az", "id")

foreach ($l in $locales) {
  Write-Host "========== $l =========="
  npm run i18n:translate-risk-scoring -- --resume --locale=$l
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

npm run i18n:merge-risk-scoring
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm run i18n:verify-locale-parity
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "All done."
