param([Parameter(Mandatory=$true)][string]$PgBin,[Parameter(Mandatory=$true)][string]$ScratchRoot)
$ErrorActionPreference='Stop'
$taskBackend=Split-Path $PSScriptRoot -Parent
$taskNode=(Get-Command node.exe).Source
$taskScratch=Join-Path ([IO.Path]::GetFullPath($ScratchRoot)) ('installments-'+[guid]::NewGuid().ToString('N'))
$taskCluster=Join-Path $taskScratch 'pgdata'
$taskStarted=$false
$taskSavedEnv=@{}
foreach($taskKey in @('DATABASE_URL','QUALITY_V3_DATABASE_URL','M4_AI_ENABLED','ANTHROPIC_API_KEY')){$taskSavedEnv[$taskKey]=[Environment]::GetEnvironmentVariable($taskKey,'Process')}
$taskProbe=[Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,55433)
try{$taskProbe.Start()}finally{$taskProbe.Stop()}
New-Item -ItemType Directory -Path $taskScratch | Out-Null
function RunHidden([string]$file,[string[]]$arguments,[string]$label){
 $taskProcess=Start-Process -FilePath $file -ArgumentList $arguments -WorkingDirectory $taskScratch -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $taskScratch ($label+'.log')) -RedirectStandardError (Join-Path $taskScratch ($label+'-error.log'))
 $taskHandle=$taskProcess.Handle
 $taskProcess.WaitForExit()
 $taskProcess.Refresh()
 if($taskProcess.ExitCode -ne 0){throw "Offline runner failed at $label ($($taskProcess.ExitCode)); see $taskScratch"}
}
try{
 Push-Location $taskBackend
 try{& $taskNode node_modules/typescript/bin/tsc -p tsconfig.json;if($LASTEXITCODE -ne 0){throw 'Build failed'}}finally{Pop-Location}
 RunHidden (Join-Path $PgBin 'initdb.exe') @('-D',('"'+$taskCluster+'"'),'-U','quality_test','-A','trust','--encoding=UTF8','--no-locale') 'initdb'
 RunHidden (Join-Path $PgBin 'pg_ctl.exe') @('-D',('"'+$taskCluster+'"'),'-o','"-p 55433 -h 127.0.0.1"','-l',('"'+(Join-Path $taskScratch 'postgres.log')+'"'),'-w','start') 'start'
 $taskStarted=$true
 RunHidden (Join-Path $PgBin 'createdb.exe') @('-w','-h','127.0.0.1','-p','55433','-U','quality_test','dimora_v5_quality_v3_test') 'createdb'
 $env:QUALITY_V3_DATABASE_URL='postgresql://quality_test@127.0.0.1:55433/dimora_v5_quality_v3_test'
 $env:DATABASE_URL=$env:QUALITY_V3_DATABASE_URL
 $env:M4_AI_ENABLED='false'
 Remove-Item Env:ANTHROPIC_API_KEY -ErrorAction SilentlyContinue
 Copy-Item -LiteralPath (Join-Path $taskBackend 'prisma') -Destination (Join-Path $taskScratch 'prisma') -Recurse
 RunHidden $taskNode @(('"'+(Join-Path $taskBackend 'node_modules/prisma/build/index.js')+'"'),'migrate','deploy','--schema','prisma/schema.prisma') 'migrations'
 # No .env or provider configuration is read. All suites block provider fetch and strictly assert the isolated DB address.
 RunHidden $taskNode @('--test','--test-concurrency=1',('"'+(Join-Path $taskBackend 'test/installment-linking.integration.test.cjs')+'"'),('"'+(Join-Path $taskBackend 'test/q48-invoices.integration.test.cjs')+'"'),('"'+(Join-Path $taskBackend 'test/order-roles.integration.test.cjs')+'"')) 'tests'
 Get-Content (Join-Path $taskScratch 'tests.log')
}finally{
 try{if($taskStarted){RunHidden (Join-Path $PgBin 'pg_ctl.exe') @('-D',('"'+$taskCluster+'"'),'-m','fast','-w','stop') 'stop'}}finally{foreach($taskKey in $taskSavedEnv.Keys){[Environment]::SetEnvironmentVariable($taskKey,$taskSavedEnv[$taskKey],'Process')}}
 Write-Output "Retained isolated directory: $taskScratch"
}
