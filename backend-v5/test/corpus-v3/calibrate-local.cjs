// Read-only, explicitly consented local aggregate statistics. Never logs identifiers/text.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
async function run(){
 if(!process.argv.includes('--consent-local-aggregates'))throw Error('consent_required');
 const {PrismaClient}=require('../../generated/client');
 const {assertDevelopmentDatabase}=require('../../dist/prisma.service');
 assertDevelopmentDatabase(process.env.DATABASE_URL);
 const db=new PrismaClient();let docs;
 try{docs=await db.$transaction(async tx=>{await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');return tx.document.findMany({where:{uploader:{email:{not:{endsWith:'@example.test'}}},home:{name:{not:{contains:'COLLAUDO'}}}},select:{original:{select:{file:{select:{storageKey:true}}}}}});});}finally{await db.$disconnect();}
 const root=path.resolve(__dirname,'../../storage-private');
 const paths=docs.flatMap(d=>{const key=d.original?.file.storageKey;return key&&/^[a-f0-9-]{36}\.bin$/.test(key)?[path.join(root,key)]:[];});
 const python=process.env.DIMORA_CORPUS_PYTHON;
 if(!python)throw Error('python_path_required');
 const r=spawnSync(python,[path.join(__dirname,'aggregate-structure.py')],{input:JSON.stringify(paths),encoding:'utf8',windowsHide:true,maxBuffer:1024*1024});
 if(r.status!==0)throw Error('aggregate_failed');
 const result=JSON.parse(r.stdout);
 const target=process.argv.indexOf('--output');
 if(target<0||!process.argv[target+1])throw Error('output_required');
 fs.writeFileSync(path.resolve(process.argv[target+1]),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({documents:result.documents,missing:result.missing,unreadable:result.unreadable,output:'aggregate-only'}));
}
if(require.main===module)run().catch(e=>{console.error('Local aggregate statistics failed; no content or identifiers logged.',/^[A-Za-z0-9_]{1,40}$/.test(e.message)?e.message:e.constructor.name,/^[A-Z0-9]{1,12}$/.test(e.code??'')?e.code:'',e.message.match(/Unknown (?:argument|field) `[A-Za-z]+`/)?.[0]??'');process.exitCode=1;});
module.exports={run};
