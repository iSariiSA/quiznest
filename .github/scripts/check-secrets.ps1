$ErrorActionPreference = 'Stop'
$version = '8.30.1'
$expectedHash = 'D29144DEFF3A68AA93CED33DDDF84B7FDC26070ADD4AA0F4513094C8332AFC4E'
$toolDirectory = Join-Path ([IO.Path]::GetTempPath()) "quiznet-gitleaks-$version"
New-Item -ItemType Directory -Path $toolDirectory -Force | Out-Null
$archive = Join-Path $toolDirectory "gitleaks_${version}_windows_x64.zip"
if (-not (Test-Path -LiteralPath $archive)) {
    Invoke-WebRequest -Uri "https://github.com/gitleaks/gitleaks/releases/download/v$version/gitleaks_${version}_windows_x64.zip" -OutFile $archive
}
if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne $expectedHash) {
    throw 'Gitleaks archive does not match the pinned official SHA256 checksum.'
}
Expand-Archive -LiteralPath $archive -DestinationPath $toolDirectory -Force
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
& (Join-Path $toolDirectory 'gitleaks.exe') git --redact=100 --no-banner --no-color --log-opts='--all --full-history' $repoRoot
if ($LASTEXITCODE -ne 0) { throw "Secret scan failed (exit $LASTEXITCODE)." }
