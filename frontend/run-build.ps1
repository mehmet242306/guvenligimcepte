Set-Location $PSScriptRoot
npm.cmd run build *> build-full.txt
$code = $LASTEXITCODE
Add-Content build-full.txt "`nEXIT_CODE: $code"
Write-Host "Build completed with exit code: $code"
