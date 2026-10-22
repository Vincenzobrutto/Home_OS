param([Parameter(Mandatory=$true)][string]$PgBin,[Parameter(Mandatory=$true)][string]$CampaignRoot,[ValidateSet('prepare','run','report')][string]$Action='prepare')
$ErrorActionPreference='Stop'
$taskBackend=Split-Path $PSScriptRoot -Parent
$taskNode=(Get-Command node.exe).Source
$taskRoot=[IO.Path]::GetFullPath($CampaignRoot)
$taskCluster=Join-Path $taskRoot 'pgdata'
$taskStarted=$false
function Checked { if($LASTEXITCODE -ne 0){throw "Synthetic campaign command stopped: $LASTEXITCODE"} }
New-Item -ItemType Directory -Path $taskRoot -Force | Out-Null
try {
 if(!(Test-Path -LiteralPath (Join-Path $taskCluster 'PG_VERSION'))){& (Join-Path $PgBin 'initdb.exe') -D $taskCluster -U quality_campaign -A trust --encoding=UTF8 --no-locale *> (Join-Path $taskRoot 'initdb.log'); Checked}
 & (Join-Path $PgBin 'pg_ctl.exe') -D $taskCluster -o '-p 55433 -h 127.0.0.1' -l (Join-Path $taskRoot 'postgres.log') -w start; Checked
 $taskStarted=$true
 $env:QUALITY_V3_DATABASE_URL='postgresql://quality_campaign@127.0.0.1:55433/dimora_v5_quality_v3_campaign'
 if(!(Test-Path -LiteralPath (Join-Path $taskRoot 'database-created.txt'))){
  & (Join-Path $PgBin 'createdb.exe') -h 127.0.0.1 -p 55433 -U quality_campaign dimora_v5_quality_v3_campaign; Checked
  Copy-Item -LiteralPath (Join-Path $taskBackend 'prisma') -Destination (Join-Path $taskRoot 'prisma') -Recurse
  $env:DATABASE_URL=$env:QUALITY_V3_DATABASE_URL
  $taskMigration=Start-Process -FilePath $taskNode -ArgumentList @(('"'+(Join-Path $taskBackend 'node_modules/prisma/build/index.js')+'"'),'migrate','deploy','--schema','prisma/schema.prisma') -WorkingDirectory $taskRoot -WindowStyle Hidden -Wait -PassThru -RedirectStandardOutput (Join-Path $taskRoot 'migrations.log') -RedirectStandardError (Join-Path $taskRoot 'migrations-error.log')
  if($taskMigration.ExitCode -ne 0){throw 'Campaign database migration failed'}
  [IO.File]::WriteAllText((Join-Path $taskRoot 'database-created.txt'),'synthetic campaign database only; migrations applied')
 }
 Push-Location $taskBackend
 try{& $taskNode test/quality-v3-live.cjs $Action $taskRoot; Checked}finally{Pop-Location}
}finally{if($taskStarted){& (Join-Path $PgBin 'pg_ctl.exe') -D $taskCluster -m fast -w stop | Out-Null; Checked}}
