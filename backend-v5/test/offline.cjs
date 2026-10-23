'use strict';
const fs = require('node:fs'), path = require('node:path'), net = require('node:net');
const { spawn, spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const suites = require('./offline-suites.cjs');
const { DB_URL, DB_PORT, API_PORT, assertOfflineDatabase, cleanEnvironment, assertOwnedRun } = require('./offline-policy.cjs');
const backend = path.resolve(__dirname, '..');
function parseArgs(args) {
 const result = { suite: 'test' };
 const seen = new Set();
 const keys = { '--suite': 'suite', '--pg-bin': 'pgBin', '--scratch-root': 'scratchRoot' };
 for (let i = 0; i < args.length; i++) {
  if (args[i] === '--list' && args.length === 1) return { list: true };
  const key = keys[args[i]];
  if (!key || !args[i + 1] || seen.has(key)) throw Error('offline_arguments_invalid');
  seen.add(key); result[key] = args[++i];
 }
 if (!Object.hasOwn(suites, result.suite)) throw Error('offline_suite_unknown');
 return result;
}
async function assertFreePort(port) {
 const server = net.createServer();
 await new Promise((resolve, reject) => {
  server.once('error', () => reject(Error('offline_port_occupied:' + port)));
  server.listen({ host: '127.0.0.1', port, exclusive: true }, resolve);
 });
 await new Promise(resolve => server.close(resolve));
}
function patchExactly(file, pairs) {
 let content = fs.readFileSync(file, 'utf8');
 for (const [from, to] of pairs) {
  if (content.split(from).length !== 2) throw Error('offline_copy_guard_changed');
  content = content.replaceAll(from, to);
 }
 fs.writeFileSync(file, content);
}
function copyInputs(destination) {
 const root = path.dirname(backend);
 const tracked = spawnSync('git', ['-C', root, 'ls-files', '-z', '--', 'backend-v5/src', 'backend-v5/test', 'backend-v5/prisma', 'docs/v5/fixtures', 'docs/v5/fase0-quality-v3-authorization-20261022.json', 'docs/v5/fase0-quality-v24-authorization-20261023.json', 'docs/v5/fase0-document-family-matrix-v4-20261023.json'], { encoding: 'utf8', windowsHide: true, env: cleanEnvironment(process.env, 'unit') });
 if (tracked.status !== 0) throw Error('offline_inputs_unavailable');
 for (const relative of tracked.stdout.split('\0').filter(Boolean)) {
  if (/(?:^|[/\\])\.env(?:\.|$)|recovery-mail\.local|\.build|\.data/.test(relative)) throw Error('offline_input_forbidden');
  const source = path.join(root, relative), target = path.join(destination, relative);
  if (fs.lstatSync(source).isSymbolicLink()) throw Error('offline_input_symlink');
  fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(source, target);
 }
 const copy = path.join(destination, 'backend-v5');
 for (const folder of ['dist', 'generated']) fs.cpSync(path.join(backend, folder), path.join(copy, folder), { recursive: true });
 fs.symlinkSync(path.join(backend, 'node_modules'), path.join(copy, 'node_modules'), 'junction');
 patchExactly(path.join(copy, 'dist/prisma.service.js'), [["'55432'", "'" + DB_PORT + "'"], ["'/dimora_v5_product_dev'", "'/dimora_v5_quality_v3_test'"], ["'dimora_v5_app'", "'quality_test'"]]);
 patchExactly(path.join(copy, 'dist/main.js'), [["app.setGlobalPrefix('api/v5');", "app.setGlobalPrefix('api/v5'); app.use((_req, res, next) => { res.setHeader('X-Dimora-Offline-Run', process.env.DIMORA_OFFLINE_TOKEN); next(); });"], ['app.listen(3001,', 'app.listen(' + API_PORT + ','], ['127.0.0.1:3001/api/v5', '127.0.0.1:' + API_PORT + '/api/v5']]);
 // Only addresses in the isolated test copy change. Assertions and source guards
 // in the repository remain unchanged; UI Origin/CSRF expectations stay at 5174.
 for (const name of fs.readdirSync(path.join(copy, 'test')).filter(name => name.endsWith('.cjs'))) {
  const file = path.join(copy, 'test', name), content = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, isolateTestAddresses(content));
 }
 return copy;
}
function isolateTestAddresses(content) {
 return content.replaceAll('http://127.0.0.1:3001/api/v5', 'http://127.0.0.1:' + API_PORT + '/api/v5')
  .replaceAll(':55433/', ':' + DB_PORT + '/')
  .replace(/(['"])55433\1/gu, (_match, quote) => quote + DB_PORT + quote);
}
async function run(options) {
 const suite = suites[options.suite];
 if (!suite) throw Error('offline_suite_unknown');
 const database = suite.database;
 // Never accept inherited real/remote DB credentials, even though children are scrubbed.
 for (const key of ['DATABASE_URL', 'QUALITY_V3_DATABASE_URL']) if (process.env[key]) assertOfflineDatabase(process.env[key]);
 if (database && (!options.pgBin || !options.scratchRoot)) throw Error('offline_db_requires_pg_bin_and_scratch_root');
 if (database && process.platform !== 'win32') throw Error('offline_db_windows_required');
 const env = cleanEnvironment(process.env, 'unit');
 let runDir, copy = backend, token, api, started = false, active, interrupted = false;
 function stopChild(child) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32') spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { env, windowsHide: true, stdio: 'ignore', timeout: 10000 });
  else child.kill();
 }
 const stopOnSignal = () => { interrupted = true; stopChild(active); };
 process.on('SIGINT', stopOnSignal); process.on('SIGTERM', stopOnSignal);
 const pg = name => path.join(path.resolve(options.pgBin), name + '.exe');
 async function command(executable, args, label, cwd = copy, commandEnv = env) {
  if (interrupted) throw Error('offline_interrupted');
  const log = runDir ? path.join(runDir, label + '.log') : null;
  const out = log ? fs.openSync(log, 'w') : null;
  try {
   active = spawn(executable, args, { cwd, env: commandEnv, windowsHide: true, stdio: out === null ? 'inherit' : ['ignore', out, out] });
   const child = active;
   let expired = false;
   const timer = setTimeout(() => { expired = true; stopChild(child); }, 600000);
   let status;
   try { status = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); }); }
   finally { clearTimeout(timer); }
   if (expired) throw Error('offline_command_timeout:' + label);
   if (active === child) active = null;
   if (status !== 0) throw Error('offline_command_failed:' + label);
   if (log) console.log(label + ': passed (' + log + ')');
  } finally { if (out !== null) fs.closeSync(out); }
 }
 async function stopApi() {
  const child = api; api = null;
  if (child && child.exitCode === null) {
   const exited = new Promise(resolve => { child.once('exit', resolve); setTimeout(resolve, 5000).unref(); });
   stopChild(child); await exited;
   if (child.exitCode === null && child.signalCode === null) throw Error('offline_api_stop_failed');
  }
  delete env.DIMORA_OFFLINE_API;
 }
 function pgControl(action) {
  assertOwnedRun(runDir, token);
  const cluster = path.join(runDir, 'pgdata');
  const args = ['-D', cluster, ...(action === 'start' ? ['-o', '-p ' + DB_PORT + ' -h 127.0.0.1', '-l', path.join(runDir, 'postgres.log')] : ['-m', 'fast']), '-w', action];
  const result = spawnSync(pg('pg_ctl'), args, { cwd: runDir, env, windowsHide: true, encoding: 'utf8', timeout: 30000 });
  fs.writeFileSync(path.join(runDir, action + '-postgres.log'), (result.stdout ?? '') + (result.stderr ?? ''));
  if (result.status !== 0) throw Error('offline_cluster_' + action + '_failed');
 }
 function startCluster() {
  try { pgControl('start'); started = true; }
  catch (error) { started = fs.existsSync(path.join(runDir, 'pgdata/postmaster.pid')); throw error; }
 }
 try {
  if (database) {
   for (const name of ['initdb', 'pg_ctl', 'createdb']) if (!fs.existsSync(pg(name))) throw Error('offline_pg_bin_invalid');
   await assertFreePort(DB_PORT); if (suite.api) await assertFreePort(API_PORT);
   const root = path.resolve(options.scratchRoot);
   if (root === path.parse(root).root || root === backend || root.startsWith(backend + path.sep)) throw Error('offline_scratch_forbidden');
   fs.mkdirSync(root, { recursive: true }); runDir = fs.mkdtempSync(path.join(root, 'dimora-offline-')); token = randomUUID();
   fs.writeFileSync(path.join(runDir, 'offline-owner.json'), JSON.stringify({ directory: runDir, token, databaseUrl: DB_URL }));
   console.log('Isolated run retained: ' + runDir);
  }
  await command(process.execPath, [path.join(backend, 'node_modules/typescript/bin/tsc'), '-p', path.join(backend, 'tsconfig.json')], 'build', backend);
  if (database) {
   copy = copyInputs(path.join(runDir, 'repo'));
   Object.assign(env, cleanEnvironment(process.env, 'db', runDir, token));
   await command(pg('initdb'), ['-D', path.join(runDir, 'pgdata'), '-U', 'quality_test', '-A', 'trust', '--encoding=UTF8', '--no-locale'], 'initdb', runDir);
   // No reuse and no attachment to an existing server. postmaster.pid in our
   // fresh directory is the only cluster pg_ctl may ever stop.
   startCluster();
   await command(pg('createdb'), ['-w', '-h', '127.0.0.1', '-p', String(DB_PORT), '-U', 'quality_test', 'dimora_v5_quality_v3_test'], 'createdb', runDir);
   await command(process.execPath, [path.join(backend, 'node_modules/prisma/build/index.js'), 'migrate', 'deploy', '--schema', path.join(copy, 'prisma/schema.prisma')], 'migrations');
   if (suite.api) {
    env.DIMORA_OFFLINE_API = '1';
    const fd = fs.openSync(path.join(runDir, 'api.log'), 'w');
    try { api = spawn(process.execPath, ['dist/main.js'], { cwd: copy, env, windowsHide: true, stdio: ['ignore', fd, fd] }); }
    finally { fs.closeSync(fd); }
    api.on('error', () => {});
    let ready = false;
    for (let i = 0; i < 80; i++) {
     if (api.exitCode !== null || interrupted) throw Error('offline_api_exited');
     try { const r = await fetch('http://127.0.0.1:' + API_PORT + '/api/v5/session', { signal: AbortSignal.timeout(500) }); if (r.ok && r.headers.get('x-dimora-offline-run') === token) { ready = true; break; } } catch { /* readiness only */ }
     await new Promise(resolve => setTimeout(resolve, 250));
    }
    if (!ready) throw Error('offline_api_not_ready');
   }
  }
  const apiFiles = suite.apiFiles ?? [];
  if (apiFiles.length) {
   try { await command(process.execPath, ['--test', '--test-concurrency=1', ...apiFiles], 'http-tests'); }
   finally { await stopApi(); }
  }
  // API queue workers must not compete with tests that explicitly claim jobs.
  const directFiles = suite.files.filter(file => !apiFiles.includes(file));
  if (directFiles.length) await command(process.execPath, ['--test', '--test-concurrency=1', ...directFiles], 'tests');
  if (suite.restartFiles) {
   pgControl('stop'); started = false; startCluster();
   await command(process.execPath, ['--test', '--test-concurrency=1', ...suite.restartFiles], 'restart-tests');
  }
 } finally {
  try {
   try { await stopApi(); } finally { if (started) pgControl('stop'); }
  } finally {
   process.removeListener('SIGINT', stopOnSignal); process.removeListener('SIGTERM', stopOnSignal);
   if (runDir) console.log('Retained; no files deleted: ' + runDir);
  }
 }
}
async function main() {
 const options = parseArgs(process.argv.slice(2));
 if (options.list) console.log(Object.keys(suites).join('\n')); else await run(options);
}
if (require.main === module) main().catch(error => { console.error(error.message?.startsWith('offline_') ? error.message : 'offline_runner_failed'); process.exitCode = 1; });
module.exports = { isolateTestAddresses, parseArgs, assertFreePort, patchExactly, run };
