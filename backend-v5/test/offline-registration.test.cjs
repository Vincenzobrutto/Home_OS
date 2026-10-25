'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const suites=require('./offline-suites.cjs');
test('every backend test file belongs to an explicit protected offline profile',()=>{
 const files=[];
 function visit(directory){for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isDirectory())visit(file);else if(entry.isFile()&&entry.name.endsWith('.test.cjs'))files.push('test/'+path.relative(__dirname,file).replaceAll('\\','/'));}}
 visit(__dirname);
 const registered=new Set(Object.values(suites).flatMap(s=>[...(s.files??[]),...(s.apiFiles??[]),...(s.restartFiles??[])]));
 assert.deepEqual(files.filter(file=>!registered.has(file)),[],'Unregistered tests do not run through npm aliases');
 for(const file of registered)assert(fs.existsSync(path.join(__dirname,'..',file)),file+' must exist');
});
test('ordinary tests include the restored unit group and DB aggregate includes the complete workflow profile',()=>{
 for(const file of suites['test:document-workflow'].files)assert(suites.test.files.includes(file),file);
 for(const file of suites['test:document-workflow-db'].files)assert(suites['test:offline-db'].files.includes(file),file);
 assert(suites.test.files.includes('test/offline-registration.test.cjs'));
 assert(suites['test:offline-guards'].files.includes('test/offline-registration.test.cjs'));
});
