param([string]$Output = "dist/campus-application-autofill.zip")
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
node (Join-Path $PSScriptRoot "validate-release.js")
if ($LASTEXITCODE -ne 0) { throw "Release validation failed" }
$outPath = Join-Path $root $Output
$outDir = Split-Path -Parent $outPath
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$files = @("manifest.json","popup.html","popup.js","options.html","options.js","styles.css","content.js","field-rules.js","page-bridge.js","profile.example.json","PRIVACY.md","PRIVACY.en.md","README.md","README.en.md","DISCLAIMER.md")
$items = $files | ForEach-Object { Join-Path $root $_ }
$items += Join-Path $root "icons"
$items += Join-Path $root "_locales"
if (Test-Path $outPath) { Remove-Item -LiteralPath $outPath }
Compress-Archive -LiteralPath $items -DestinationPath $outPath
Write-Host "Created $outPath"
