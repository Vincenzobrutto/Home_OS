'use strict';
// Explicit local manifests only. This tool never fetches images or calls a provider.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const [manifest,output]=process.argv.slice(2);assert(manifest&&output&&process.argv.length===4,'Usage: node build.cjs cases.private.json output.html');
const cases=JSON.parse(fs.readFileSync(path.resolve(manifest),'utf8'));assert(Array.isArray(cases)&&cases.length>=1&&cases.length<=5);
for(const c of cases)assert(c&&typeof c.label==='string'&&c.label.length<=200&&typeof c.image==='string'&&c.image.length<24*1024*1024&&/^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(c.image)&&c.proposal&&Array.isArray(c.proposal.spaces)&&Array.isArray(c.proposal.symbols)&&c.config);
const front=createRequire(path.resolve(__dirname,'../../../frontend-v5/package.json'));
const script=front('esbuild').buildSync({entryPoints:[path.join(__dirname,'entry.ts')],bundle:true,write:false,format:'iife',platform:'browser',target:'es2022'}).outputFiles[0].text;
const template=fs.readFileSync(path.join(__dirname,'shell.html'),'utf8');assert(template.match(/__CASES__/g)?.length===1&&template.match(/__BUNDLE__/g)?.length===1);
const html=template.replace(/__(?:CASES|BUNDLE)__/g,token=>token==='__CASES__'?JSON.stringify(cases).replace(/</g,()=>String.fromCharCode(92)+'u003c'):script.replace(/<\/script/gi,()=>'<'+String.fromCharCode(92)+'/script'));
fs.writeFileSync(path.resolve(output),html);console.log('Built private offline threshold lab; no network, AI or application persistence.');
