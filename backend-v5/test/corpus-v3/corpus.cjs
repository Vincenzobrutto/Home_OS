const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const ROOT=__dirname;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function load(){
 const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'manifest.json'),'utf8'));
 if(manifest.format!=='dimora-onboarding-quality'||!/^corpus-v3\.\d+$/.test(manifest.version))throw Error('corpus_version');
 const ids=new Set();
 return {manifest,cases:manifest.cases.map(e=>{
  if(!/^Q\d{2}$/.test(e.id)||ids.has(e.id))throw Error('corpus_id');ids.add(e.id);
  for(const p of [e.path,e.gold])if(path.resolve(ROOT,p).startsWith(ROOT+path.sep)===false)throw Error('corpus_path');
  const bytes=fs.readFileSync(path.join(ROOT,e.path)),gold=JSON.parse(fs.readFileSync(path.join(ROOT,e.gold),'utf8'));
  if(sha(bytes)!==e.sha256||gold.sourceSha256!==e.sha256||gold.id!==e.id||gold.version!==manifest.goldVersion)throw Error('corpus_hash_or_gold_version');
  return {...e,bytes,gold,mimeType:e.path.endsWith('.pdf')?'application/pdf':e.path.endsWith('.jpg')?'image/jpeg':'image/png'};
 })};
}
module.exports={ROOT,sha,load};
