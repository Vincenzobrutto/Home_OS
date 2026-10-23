param([Parameter(Mandatory=$true)][string]$PgBin,[Parameter(Mandatory=$true)][string]$ScratchRoot)
$ErrorActionPreference='Stop'
$taskBackend=Split-Path $PSScriptRoot -Parent
$taskNode=(Get-Command node.exe).Source
$taskScratch=Join-Path ([IO.Path]::GetFullPath($ScratchRoot)) ('night-plan-'+[guid]::NewGuid().ToString('N'))
$taskCopy=Join-Path $taskScratch 'backend-v5'
$taskCluster=Join-Path $taskScratch 'pgdata'
$taskStarted=$false
$taskApi=$null
$taskSavedEnv=@{}
foreach($taskEnvKey in @('DATABASE_URL','QUALITY_V3_DATABASE_URL','M4_AI_ENABLED','ANTHROPIC_API_KEY')){$taskSavedEnv[$taskEnvKey]=[Environment]::GetEnvironmentVariable($taskEnvKey,'Process')}
function Checked {if($LASTEXITCODE -ne 0){throw "Isolated offline verification failed: $LASTEXITCODE"}}
# Never stop/reuse an existing cluster or API. All copied files and generated data stay in this new directory.
foreach($taskPort in @(55433,3109)){
 $taskProbe=[Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,$taskPort)
 try{$taskProbe.Start()}finally{$taskProbe.Stop()}
}
New-Item -ItemType Directory -Path $taskCopy -Force | Out-Null
try {
 foreach($taskDir in @('dist','prisma')){Copy-Item -LiteralPath (Join-Path $taskBackend $taskDir) -Destination (Join-Path $taskCopy $taskDir) -Recurse}
 # Copy versioned test inputs only; generated .build clusters are never traversed.
 foreach($taskRelative in (& git -C $taskBackend ls-files -- test)){
  $taskDestination=Join-Path $taskCopy $taskRelative
  New-Item -ItemType Directory -Path (Split-Path $taskDestination -Parent) -Force | Out-Null
  Copy-Item -LiteralPath (Join-Path $taskBackend $taskRelative) -Destination $taskDestination
 }
 New-Item -ItemType Directory -Path (Join-Path $taskCopy 'generated') | Out-Null
 Copy-Item -LiteralPath (Join-Path $taskBackend 'generated/client') -Destination (Join-Path $taskCopy 'generated/client') -Recurse
 New-Item -ItemType Junction -Path (Join-Path $taskCopy 'node_modules') -Value (Join-Path $taskBackend 'node_modules') | Out-Null
 New-Item -ItemType Directory -Path (Join-Path $taskCopy 'src/review') -Force | Out-Null
 Copy-Item -LiteralPath (Join-Path $taskBackend 'src/review/pdf-worker.cjs') -Destination (Join-Path $taskCopy 'src/review/pdf-worker.cjs')
 # Only the scratch build changes its strict DB address and API port. Repository guards remain intact.
 $taskGuard=Join-Path $taskCopy 'dist/prisma.service.js'
 $taskGuardText=[IO.File]::ReadAllText($taskGuard)
 foreach($taskPair in @(@("'55432'","'55433'"),@("'/dimora_v5_product_dev'","'/dimora_v5_quality_v3_test'"),@("'dimora_v5_app'","'quality_test'"))){
  if(!$taskGuardText.Contains($taskPair[0])){throw 'Unexpected compiled database guard'}
  $taskGuardText=$taskGuardText.Replace($taskPair[0],$taskPair[1])
 }
 [IO.File]::WriteAllText($taskGuard,$taskGuardText)
 $taskMain=Join-Path $taskCopy 'dist/main.js'
 $taskMainText=[IO.File]::ReadAllText($taskMain)
 if(!$taskMainText.Contains('app.listen(3001,')){throw 'Unexpected compiled API port'}
 [IO.File]::WriteAllText($taskMain,$taskMainText.Replace('app.listen(3001,','app.listen(3109,').Replace('127.0.0.1:3001/api/v5','127.0.0.1:3109/api/v5'))
 $taskDocuments=Join-Path $taskCopy 'test/documents.integration.test.cjs'
 [IO.File]::WriteAllText($taskDocuments,[IO.File]::ReadAllText($taskDocuments).Replace('http://127.0.0.1:3001/api/v5','http://127.0.0.1:3109/api/v5'))
 & (Join-Path $PgBin 'initdb.exe') -D $taskCluster -U quality_test -A trust --encoding=UTF8 --no-locale *> (Join-Path $taskScratch 'initdb.log');Checked
 & (Join-Path $PgBin 'pg_ctl.exe') -D $taskCluster -o '-p 55433 -h 127.0.0.1' -l (Join-Path $taskScratch 'postgres.log') -w start;Checked
 $taskStarted=$true
 & (Join-Path $PgBin 'createdb.exe') -h 127.0.0.1 -p 55433 -U quality_test dimora_v5_quality_v3_test;Checked
 $env:QUALITY_V3_DATABASE_URL='postgresql://quality_test@127.0.0.1:55433/dimora_v5_quality_v3_test'
 $env:DATABASE_URL=$env:QUALITY_V3_DATABASE_URL
 $env:M4_AI_ENABLED='false'
 Remove-Item Env:ANTHROPIC_API_KEY -ErrorAction SilentlyContinue
 $taskMigrate=Start-Process -FilePath $taskNode -ArgumentList @(('"'+(Join-Path $taskBackend 'node_modules/prisma/build/index.js')+'"'),'migrate','deploy','--schema','prisma/schema.prisma') -WorkingDirectory $taskCopy -WindowStyle Hidden -Wait -PassThru -RedirectStandardOutput (Join-Path $taskScratch 'migrations.log') -RedirectStandardError (Join-Path $taskScratch 'migrations-error.log')
 if($taskMigrate.ExitCode -ne 0){throw 'Isolated migrations failed'}
 # No .env, recovery-mail.local.json or AI authorization/config is copied or loaded.
 $taskNetwork=Join-Path $taskScratch 'offline-network.cjs'
 [IO.File]::WriteAllText($taskNetwork,@'
const original=global.fetch;
global.fetch=async(input,init)=>{const u=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);if(u.protocol!=='http:'||u.hostname!=='127.0.0.1'||!u.port||['3001','5174','55432','55433'].includes(u.port)){process.exitCode=1;throw Error('offline_network_forbidden');}return original(input,init);};
'@)
 $taskApi=Start-Process -FilePath $taskNode -ArgumentList @('--require',('"'+$taskNetwork+'"'),'dist/main.js') -WorkingDirectory $taskCopy -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $taskScratch 'api.log') -RedirectStandardError (Join-Path $taskScratch 'api-error.log')
 $taskReady=$false
 for($taskWait=0;$taskWait -lt 60;$taskWait++){
  if($taskApi.HasExited){throw 'Isolated API exited before readiness'}
  try{$taskSession=Invoke-RestMethod 'http://127.0.0.1:3109/api/v5/session';$taskReady=$true;break}catch{Start-Sleep -Milliseconds 250}
 }
 if(!$taskReady){throw 'Isolated API readiness timed out'}
 Push-Location $taskCopy
 try{
  & $taskNode --require $taskNetwork --test --test-concurrency=1 test/contacts.http.test.cjs test/object-onboarding.http.test.cjs test/activities.http.test.cjs test/home-objects.http.test.cjs test/documents.integration.test.cjs test/object-onboarding.integration.test.cjs test/automatic-intake.integration.test.cjs *> (Join-Path $taskScratch 'http-db-tests.log');Checked
  & $taskNode --test --test-concurrency=1 test/q48-coverage.integration.test.cjs test/q22-lines.integration.test.cjs test/q15-payment.integration.test.cjs test/q48-invoices.integration.test.cjs *> (Join-Path $taskScratch 'coverage-db-tests.log');Checked
 }finally{Pop-Location}
 Write-Output "Offline HTTP/DB + Q15/Q22/Q48 complete; retained at $taskScratch"
}finally{
 try{
 if($taskApi -and !$taskApi.HasExited){Stop-Process -Id $taskApi.Id; $taskApi.WaitForExit()}
 if($taskStarted){& (Join-Path $PgBin 'pg_ctl.exe') -D $taskCluster -m fast -w stop | Out-Null;Checked}
 }finally{foreach($taskEnvKey in $taskSavedEnv.Keys){[Environment]::SetEnvironmentVariable($taskEnvKey,$taskSavedEnv[$taskEnvKey],'Process')}}
 Write-Output "Retained isolated directory: $taskScratch"
}
