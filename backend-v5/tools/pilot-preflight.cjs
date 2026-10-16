// Non-destructive local checks. Never reads .env, connects to a DB or calls a provider.
const {readFile,lstat,readdir,statfs}=require('node:fs/promises');
const {createHash}=require('node:crypto');
const {resolve,join,relative,isAbsolute}=require('node:path');
const workspace=resolve(__dirname,'../../..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function inside(root,path){const rel=relative(root,path);return rel&&!rel.startsWith('..')&&!isAbsolute(rel);}
async function regular(path){const stat=await lstat(path);if(!stat.isFile()||stat.isSymbolicLink())throw Error('not_regular');return stat;}
async function backupCheck(path){
  const root=resolve(workspace,'backups'),target=resolve(path);
  if(!inside(root,target))throw Error('backup_outside_workspace');
  const directory=await lstat(target);if(!directory.isDirectory()||directory.isSymbolicLink())throw Error('backup_not_directory');
  await regular(join(target,'manifest.json'));
  const m=JSON.parse(await readFile(join(target,'manifest.json'),'utf8'));
  if(m.format!=='dimora-v5-local-backup-v1'||m.verified!==true||m.restoreStopped!==true||m.restoreVerification?.countsEqual!==true||m.restoreVerification?.copyHashesEqual!==true||!Array.isArray(m.files)||!/^[a-f0-9]{64}$/.test(m.dumpSha256))throw Error('backup_not_verified');
  await regular(join(target,'database.dump'));
  if(sha(await readFile(join(target,'database.dump')))!==m.dumpSha256)throw Error('dump_hash_mismatch');
  const originals=join(target,'originals');const originalStat=await lstat(originals);
  if(!originalStat.isDirectory()||originalStat.isSymbolicLink())throw Error('originals_not_directory');
  const seen=new Set();
  for(const f of m.files){
    if(!/^[a-f0-9-]{36}\.bin$/.test(f.key)||seen.has(f.key)||!Number.isSafeInteger(f.byteSize)||f.byteSize<0||!/^[a-f0-9]{64}$/.test(f.sha256))throw Error('manifest_file_invalid');seen.add(f.key);
    const path=join(originals,f.key),stat=await regular(path);
    if(stat.size!==f.byteSize||sha(await readFile(path))!==f.sha256)throw Error('original_hash_mismatch');
  }
  if(m.restoreVerification.verifiedOriginals!==seen.size)throw Error('backup_count_mismatch');
  return {status:'pass',snapshotAt:m.createdAt,originalsVerified:seen.size,restoreTables:m.restoreVerification.tables,ageHours:Math.round((Date.now()-Date.parse(m.createdAt))/360000)/10,sameDeviceOnly:true};
}
async function apiCheck(){
  const response=await fetch('http://127.0.0.1:3001/api/v5/session',{signal:AbortSignal.timeout(3000),redirect:'error'});
  const body=await response.json();
  return {status:response.status===200&&typeof body.csrfToken==='string'&&response.headers.get('cache-control')==='no-store'&&response.headers.get('x-content-type-options')==='nosniff'?'pass':'fail',httpStatus:response.status,recoveryEnabled:body.authRecovery?.enabled===true};
}
async function main(){
  const arg=process.argv.slice(2);if(arg.length!==2||arg[0]!=='--backup')throw Error('usage: node tools/pilot-preflight.cjs --backup ABSOLUTE_BACKUP_DIRECTORY');
  const report={format:'dimora-v5-pilot-preflight-v1',at:new Date().toISOString(),nonDestructive:true,apiCheckMayCreateAnonymousSession:true,pilotReady:false,checks:{},pending:['second_backup_destination','antimalware_policy','structured_export_and_retention','representative_ai_quality']};
  const checks={backup:()=>backupCheck(arg[1]),api:apiCheck,storage:async()=>{
    const root=resolve(__dirname,'../storage-private'),stat=await lstat(root);if(!stat.isDirectory()||stat.isSymbolicLink())throw Error('storage_not_directory');
    const space=await statfs(root,{bigint:true}),free=space.bavail*space.bsize;
    const entries=await readdir(root);return {status:free>=1024n*1024n*1024n?'pass':'warning',freeBytes:String(free),minimumOperationalReserveBytes:'1073741824',originalEntries:entries.filter(name=>/^[a-f0-9-]{36}\.bin$/.test(name)).length,stagedEntries:entries.filter(name=>/^[a-f0-9-]{36}\.bin\.part$/.test(name)).length,quotaEnforced:false};
  }};
  for(const [name,check] of Object.entries(checks))try{report.checks[name]=await check();}catch{report.checks[name]={status:'fail',message:'Verifica non completata; controllare il componente locale senza condividere credenziali o documenti.'};}
  if(report.checks.api.recoveryEnabled!==true)report.pending.unshift('account_recovery');
  console.log(JSON.stringify(report,null,2));
  // Exit 0 means the read-only technical checks passed, not permission to start the pilot.
  process.exitCode=Object.values(report.checks).some(check=>check.status!=='pass')?1:0;
}
if(require.main===module)main().catch(()=>{console.error('Uso: node tools/pilot-preflight.cjs --backup PERCORSO_ASSOLUTO_BACKUP');process.exitCode=1;});
module.exports={backupCheck};
