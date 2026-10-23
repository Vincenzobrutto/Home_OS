param([Parameter(Mandatory=$true)][string]$PgBin,[Parameter(Mandatory=$true)][string]$ScratchRoot)
$ErrorActionPreference='Stop'
# Compatibility entry point; lifecycle, configuration and guards live in one runner.
& node (Join-Path $PSScriptRoot 'offline.cjs') --suite test:night-plan-db --pg-bin $PgBin --scratch-root $ScratchRoot
exit $LASTEXITCODE
