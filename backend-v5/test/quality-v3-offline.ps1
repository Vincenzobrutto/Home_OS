param([Parameter(Mandatory=$true)][string]$PgBin,[string]$ScratchRoot=(Join-Path ([IO.Path]::GetTempPath()) 'dimora-quality-v3'))
$ErrorActionPreference='Stop'
$taskBackend=Split-Path $PSScriptRoot -Parent
$taskNode=(Get-Command node.exe).Source
$taskScratch=Join-Path $ScratchRoot ('ledger-'+[guid]::NewGuid().ToString('N'))
$taskCluster=Join-Path $taskScratch 'pgdata'
$taskSavedDatabase=$env:DATABASE_URL
$taskSavedQuality=$env:QUALITY_V3_DATABASE_URL
$taskStarted=$false
function Checked { if($LASTEXITCODE -ne 0){throw "Offline quality command failed: $LASTEXITCODE"} }
New-Item -ItemType Directory -Path $taskScratch -Force | Out-Null
try {
 Push-Location $taskBackend
 try { & $taskNode 'node_modules/typescript/bin/tsc' -p tsconfig.json; Checked } finally { Pop-Location }
 & (Join-Path $PgBin 'initdb.exe') -D $taskCluster -U quality_test -A trust --encoding=UTF8 --no-locale *> (Join-Path $taskScratch 'initdb.log'); Checked
 & (Join-Path $PgBin 'pg_ctl.exe') -D $taskCluster -o '-p 55433 -h 127.0.0.1' -l (Join-Path $taskScratch 'postgres.log') -w start; Checked
 $taskStarted=$true
 & (Join-Path $PgBin 'createdb.exe') -h 127.0.0.1 -p 55433 -U quality_test dimora_v5_quality_v3_test; Checked
 $env:DATABASE_URL='postgresql://quality_test@127.0.0.1:55433/dimora_v5_quality_v3_test'
 $env:QUALITY_V3_DATABASE_URL=$env:DATABASE_URL
 # Prisma runs from a fresh scratch directory with a copied schema/migrations,
 # so no application .env is loaded, edited or needed.
 Copy-Item -LiteralPath (Join-Path $taskBackend 'prisma') -Destination (Join-Path $taskScratch 'prisma') -Recurse
 $taskMigration=Start-Process -FilePath $taskNode -ArgumentList @(('"'+(Join-Path $taskBackend 'node_modules/prisma/build/index.js')+'"'),'migrate','deploy','--schema','prisma/schema.prisma') -WorkingDirectory $taskScratch -WindowStyle Hidden -Wait -PassThru -RedirectStandardOutput (Join-Path $taskScratch 'migrations.log') -RedirectStandardError (Join-Path $taskScratch 'migrations-error.log')
 if($taskMigration.ExitCode -ne 0){throw 'Migration failed; see scratch migrations logs.'}
 Push-Location $taskBackend
 try { & $taskNode --test --test-concurrency=1 test/quality-v3-ledger.integration.test.cjs test/quality-v3-model.integration.test.cjs; Checked } finally { Pop-Location }
 # Verify committed rows remain after an actual PostgreSQL shutdown/restart.
 & (Join-Path $PgBin 'pg_ctl.exe') -D $taskCluster -m fast -w stop; Checked
 $taskStarted=$false
 & (Join-Path $PgBin 'pg_ctl.exe') -D $taskCluster -o '-p 55433 -h 127.0.0.1' -l (Join-Path $taskScratch 'postgres.log') -w start; Checked
 $taskStarted=$true
 Push-Location $taskBackend
 try { & $taskNode --test test/quality-v3-ledger-restart.test.cjs; Checked } finally { Pop-Location }
 Write-Output 'Offline durable ledger verification complete. Scratch cluster retained; product API/DB untouched.'
} finally {
 if($taskStarted){& (Join-Path $PgBin 'pg_ctl.exe') -D $taskCluster -m fast -w stop | Out-Null; Checked}
 $env:DATABASE_URL=$taskSavedDatabase
 $env:QUALITY_V3_DATABASE_URL=$taskSavedQuality
}
