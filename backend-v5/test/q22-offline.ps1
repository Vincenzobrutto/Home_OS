param([Parameter(Mandatory=$true)][string]$PgBin,[Parameter(Mandatory=$true)][string]$ScratchRoot)
$ErrorActionPreference='Stop'
$taskBackend=Split-Path $PSScriptRoot -Parent
$taskNode=(Get-Command node.exe).Source
$taskScratch=Join-Path $ScratchRoot ('invoice-lines-'+[guid]::NewGuid().ToString('N'))
$taskCluster=Join-Path $taskScratch 'pgdata'
$taskSavedDatabase=$env:DATABASE_URL
$taskSavedQuality=$env:QUALITY_V3_DATABASE_URL
$taskStarted=$false
function Checked {if($LASTEXITCODE -ne 0){throw "Q22 + Q15 + Q48 offline verification failed: $LASTEXITCODE"}}
New-Item -ItemType Directory -Path $taskScratch -Force | Out-Null
try {
 Push-Location $taskBackend
 try{& $taskNode node_modules/typescript/bin/tsc -p tsconfig.json;Checked}finally{Pop-Location}
 & (Join-Path $PgBin 'initdb.exe') -D $taskCluster -U quality_test -A trust --encoding=UTF8 --no-locale *> (Join-Path $taskScratch 'initdb.log');Checked
 & (Join-Path $PgBin 'pg_ctl.exe') -D $taskCluster -o '-p 55433 -h 127.0.0.1' -l (Join-Path $taskScratch 'postgres.log') -w start;Checked
 $taskStarted=$true
 & (Join-Path $PgBin 'createdb.exe') -h 127.0.0.1 -p 55433 -U quality_test dimora_v5_quality_v3_test;Checked
 $env:QUALITY_V3_DATABASE_URL='postgresql://quality_test@127.0.0.1:55433/dimora_v5_quality_v3_test'
 $env:DATABASE_URL=$env:QUALITY_V3_DATABASE_URL
 Copy-Item -LiteralPath (Join-Path $taskBackend 'prisma') -Destination (Join-Path $taskScratch 'prisma') -Recurse
 $taskMigration=Start-Process -FilePath $taskNode -ArgumentList @(('"'+(Join-Path $taskBackend 'node_modules/prisma/build/index.js')+'"'),'migrate','deploy','--schema','prisma/schema.prisma') -WorkingDirectory $taskScratch -WindowStyle Hidden -Wait -PassThru -RedirectStandardOutput (Join-Path $taskScratch 'migrations.log') -RedirectStandardError (Join-Path $taskScratch 'migrations-error.log')
 if($taskMigration.ExitCode -ne 0){throw 'Synthetic Q22 + Q15 + Q48 migrations failed'}
 Push-Location $taskBackend
 try{& $taskNode --test --test-concurrency=1 test/q22-lines.integration.test.cjs test/q15-payment.integration.test.cjs test/q48-invoices.integration.test.cjs;Checked}finally{Pop-Location}
 Write-Output "Q22 + Q15 + Q48 synthetic DB verification complete; retained at $taskScratch"
}finally{
 if($taskStarted){& (Join-Path $PgBin 'pg_ctl.exe') -D $taskCluster -m fast -w stop | Out-Null;Checked}
 $env:DATABASE_URL=$taskSavedDatabase
 $env:QUALITY_V3_DATABASE_URL=$taskSavedQuality
}
