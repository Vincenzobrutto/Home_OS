'use strict';
const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), net = require('node:net');
const { spawnSync } = require('node:child_process');
const { DB_URL, assertOfflineDatabase, cleanEnvironment, assertOwnedRun } = require('./offline-policy.cjs');
const { parseArgs, assertFreePort } = require('./offline.cjs');
const suites = require('./offline-suites.cjs');
const child = (code, env = cleanEnvironment(process.env, 'unit')) => spawnSync(process.execPath, ['-e', code], { env, cwd: path.resolve(__dirname, '..'), encoding: 'utf8', windowsHide: true, timeout: 15000 });

test('offline database accepts one explicit synthetic URL; real, remote, alternate and ambiguous targets fail before connection', () => {
 assertOfflineDatabase(DB_URL);
 for (const value of [undefined, '', 'postgresql://dimora_v5_app@127.0.0.1:55432/dimora_v5_product_dev', DB_URL.replace('127.0.0.1', 'localhost'), DB_URL.replace('127.0.0.1', 'db.example.test'), DB_URL + '?schema=public', DB_URL + '#fragment', DB_URL.replace('quality_test@', 'quality_test:secret@'), DB_URL.replace('55439', '55432'), DB_URL.replace('_test', '_campaign')]) assert.throws(() => assertOfflineDatabase(value), /offline_database_forbidden/);
});

test('child environment drops provider, SMTP, proxy, PostgreSQL, API overrides and inherited preload settings without changing the parent', () => {
 const parent = { PATH: 'bin', SystemRoot: 'system', TEMP: 'tmp', DATABASE_URL: 'private', QUALITY_V3_DATABASE_URL: 'private', ANTHROPIC_API_KEY: 'secret', SMTP_PASSWORD: 'secret', HTTPS_PROXY: 'secret', PGHOST: 'real', PGDATABASE: 'real', NODE_OPTIONS: '--env-file=.env', V5_ACTIVITIES_API: '1', M4_AI_ENABLED: 'true', ONBOARDING_AI_ENABLED: 'true' };
 const before = structuredClone(parent), env = cleanEnvironment(parent, 'unit');
 assert.deepEqual(parent, before); assert.equal(env.PATH, 'bin');
 for (const key of ['DATABASE_URL', 'QUALITY_V3_DATABASE_URL', 'ANTHROPIC_API_KEY', 'SMTP_PASSWORD', 'HTTPS_PROXY', 'PGHOST', 'PGDATABASE', 'V5_ACTIVITIES_API']) assert.equal(env[key], undefined);
 assert.equal(env.M4_AI_ENABLED, 'false'); assert.equal(env.ONBOARDING_AI_ENABLED, 'false'); assert(!env.NODE_OPTIONS.includes('--env-file'));
 const db = cleanEnvironment(parent, 'db', 'owned', 'token'); assert.equal(db.DATABASE_URL, DB_URL); assert.equal(db.QUALITY_V3_DATABASE_URL, DB_URL);
});

test('runner accepts only named profiles, refuses arbitrary commands and requires DB parameters before starting work', () => {
 for (const args of [['--suite', 'unknown'], ['--database-url', DB_URL], ['--suite'], ['--suite', 'test', '--suite', 'test'], ['--pg-bin', 'x', '--pg-bin', 'y'], ['--list', '--suite', 'test']]) assert.throws(() => parseArgs(args));
 assert.equal(parseArgs([]).suite, 'test');
 const result = child("require('./test/offline.cjs').run({suite:'test:q48-db'}).catch(e=>{console.error(e.message);process.exitCode=1;})");
 assert.equal(result.status, 1); assert.match(result.stderr, /offline_db_requires_pg_bin_and_scratch_root/);
 const unsafe = cleanEnvironment(process.env, 'unit'); unsafe.NODE_OPTIONS = ''; unsafe.DATABASE_URL = 'postgresql://dimora_v5_app@127.0.0.1:55432/dimora_v5_product_dev';
 const refused = child("require('./test/offline.cjs').run({suite:'test'}).catch(e=>{console.error(e.message);process.exitCode=1;})", unsafe);
 assert.equal(refused.status, 1); assert.match(refused.stderr, /offline_database_forbidden/);
 const pkg = require('../package.json');
 for (const [name, profile] of Object.entries(suites)) {
  assert.equal(pkg.scripts[name], 'node test/offline.cjs --suite ' + name);
  if (profile.database) { assert.equal(profile.api, profile.apiFiles.length > 0); assert(profile.apiFiles.every(file => profile.files.includes(file))); assert(!profile.apiFiles.some(file => file.startsWith('test/receipt-'))); }
  assert(profile.files.length); for (const file of profile.files) assert.match(file, /^test\/[\w.-]+\.cjs$/);
 }
 assert.equal(suites['test:quality-v3-db'].restartFiles.length, 1);
 assert.equal(suites['test:night-plan-db'].files.length, 11);
});

test('an occupied local port is refused and the existing listener remains owned and running', async () => {
 const server = net.createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 try { await assert.rejects(() => assertFreePort(server.address().port), /offline_port_occupied/); assert(server.listening); }
 finally { await new Promise(resolve => server.close(resolve)); }
});

test('network guard refuses AI, SMTP, raw sockets, TLS and product/UI endpoints before any connection', () => {
 const result = child(`
 const assert=require('node:assert/strict'),net=require('node:net'),tls=require('node:tls');
 (async()=>{
 for(const url of ['https://api.anthropic.com/v1/messages','http://127.0.0.1:3001/api/v5/session','http://127.0.0.1:5179/','http://localhost:3109/','http://127.0.0.1:55432/'])await assert.rejects(()=>fetch(url),/offline_network_forbidden/);
 for(const target of [{host:'127.0.0.1',port:55432},{host:'127.0.0.1',port:55433},{host:'smtp.example.test',port:25},{host:'api.anthropic.com',port:443},{path:'private-pipe'}])assert.throws(()=>new net.Socket().connect(target),/offline_network_forbidden/);
 assert.throws(()=>tls.connect({host:'api.anthropic.com',port:443}),/offline_network_forbidden/);
 })().catch(()=>{process.exitCode=1;});`);
 assert.equal(result.status, 0, result.stderr);
});

test('guard permits only HTTP listeners created by this test process', () => {
 const result = child(`
 const http=require('node:http'),assert=require('node:assert/strict');
 const server=http.createServer((req,res)=>res.end('offline-only'));
 server.listen(0,'127.0.0.1',async()=>{try{const response=await fetch('http://127.0.0.1:'+server.address().port);assert.equal(await response.text(),'offline-only');}catch{process.exitCode=1;}finally{server.closeAllConnections();server.close();}});`);
 assert.equal(result.status, 0, result.stderr);
});

test('ownership marker and DB preload reject absent or mismatched ownership and real targets', () => {
 const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dimora-offline-guard-'));
 fs.writeFileSync(path.join(dir, 'offline-owner.json'), JSON.stringify({ directory: path.resolve(dir), token: 'owned', databaseUrl: DB_URL }));
 assertOwnedRun(dir, 'owned'); assert.throws(() => assertOwnedRun(dir, 'wrong'), /offline_owner_mismatch/); assert.throws(() => assertOwnedRun(undefined, undefined), /offline_run_required/);
 const env = cleanEnvironment(process.env, 'db', dir, 'wrong'); let result = child('process.exitCode=0', env);
 assert.notEqual(result.status, 0); assert.match(result.stderr, /offline_owner_mismatch/);
 env.DATABASE_URL = 'postgresql://dimora_v5_app@127.0.0.1:55432/dimora_v5_product_dev'; result = child('process.exitCode=0', env);
 assert.notEqual(result.status, 0); assert.match(result.stderr, /offline_database_forbidden/);
});
test('isolated address adapter changes only endpoint literals, preserving Origin, values and unknown text', () => {
 const { isolateTestAddresses } = require('./offline.cjs');
 const source = `const base='http://127.0.0.1:3001/api/v5'; assert.equal(url.port,'55433'); const db='postgresql://quality_test@127.0.0.1:55433/dimora_v5_quality_v3_test'; const origin='http://127.0.0.1:5174'; const amount=55433; const sha='a55433b';`;
 const result = isolateTestAddresses(source);
 assert(result.includes('http://127.0.0.1:3119/api/v5')); assert(result.includes("assert.equal(url.port,'55439')")); assert(result.includes(':55439/dimora_v5_quality_v3_test'));
 for (const unchanged of ["const origin='http://127.0.0.1:5174'", 'const amount=55433', "const sha='a55433b'"]) assert(result.includes(unchanged));
});

test('unexpected or repeated compiled guard patterns fail without writing a partially adapted file', () => {
 const { patchExactly } = require('./offline.cjs');
 const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dimora-offline-copy-'));
 const file = path.join(dir, 'guard.js'); fs.writeFileSync(file, 'guard old');
 assert.throws(() => patchExactly(file, [['old', 'new'], ['absent', 'bad']]), /offline_copy_guard_changed/);
 assert.equal(fs.readFileSync(file, 'utf8'), 'guard old');
 fs.writeFileSync(file, 'old old'); assert.throws(() => patchExactly(file, [['old', 'new']]), /offline_copy_guard_changed/);
 assert.equal(fs.readFileSync(file, 'utf8'), 'old old');
});

test('Prisma native-engine constructors cannot bypass offline mode with an explicit real datasource', () => {
 const code = `const assert=require('node:assert/strict');const {PrismaClient}=require('./generated/client');assert.throws(()=>new PrismaClient({datasources:{db:{url:'postgresql://dimora_v5_app@127.0.0.1:55432/dimora_v5_product_dev'}}}),/offline_database_forbidden/);`;
 assert.equal(child(code).status, 0);
 const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dimora-offline-native-'));
 fs.writeFileSync(path.join(dir, 'offline-owner.json'), JSON.stringify({ directory: path.resolve(dir), token: 'owned', databaseUrl: DB_URL }));
 const result = child(code, cleanEnvironment(process.env, 'db', dir, 'owned'));
 assert.equal(result.status, 0, result.stderr);
});
