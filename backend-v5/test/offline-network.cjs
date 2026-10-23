'use strict';
// Test-process guards, not an OS sandbox: JS transports and generated Prisma
// construction are checked; PostgreSQL tools use explicit owned-cluster arguments.
const net = require('node:net'), tls = require('node:tls');
const { DB_PORT, API_PORT, assertOfflineDatabase, assertOwnedRun } = require('./offline-policy.cjs');
function install(env = process.env) {
 const mode = env.DIMORA_OFFLINE_MODE;
 if (!['unit', 'db'].includes(mode)) throw Error('offline_mode_required');
 if (mode === 'db') {
  assertOfflineDatabase(env.DATABASE_URL); assertOfflineDatabase(env.QUALITY_V3_DATABASE_URL);
  assertOwnedRun(env.DIMORA_OFFLINE_RUN_DIR, env.DIMORA_OFFLINE_TOKEN);
 } else if (env.DATABASE_URL || env.QUALITY_V3_DATABASE_URL) throw Error('offline_database_forbidden');
 require('./offline-prisma.cjs').installPrismaGuard(mode);
 const httpPorts = new Set(mode === 'db' && env.DIMORA_OFFLINE_API === '1' ? [API_PORT] : []);
 const forbidden = new Set([3001, 3109, 5174, 5179, 55432, 55433, DB_PORT]);
 const fail = () => { throw Error('offline_network_forbidden'); };
 const connect = net.Socket.prototype.connect, listen = net.Server.prototype.listen;
 const originalFetch = global.fetch;
 net.Server.prototype.listen = function (...args) {
  this.once('listening', () => {
   const address = this.address();
   if (address && !forbidden.has(address.port)) {
    httpPorts.add(address.port);
    this.once('close', () => httpPorts.delete(address.port));
   }
  });
  return listen.apply(this, args);
 };
 net.Socket.prototype.connect = function (...args) {
  // Node http may pass its pre-normalized argument array.
  const a = Array.isArray(args[0]) ? args[0] : args;
  const options = typeof a[0] === 'object' ? a[0] : { port: a[0], host: typeof a[1] === 'string' ? a[1] : 'localhost' };
  const host = options.host ?? options.hostname ?? 'localhost', port = Number(options.port);
  if (options.path || host !== '127.0.0.1' || !(httpPorts.has(port) || mode === 'db' && port === DB_PORT)) fail();
  return connect.apply(this, args);
 };
 tls.connect = fail;
 global.fetch = async (input, init) => {
  const u = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
  if (u.protocol !== 'http:' || u.hostname !== '127.0.0.1' || !httpPorts.has(Number(u.port)) || forbidden.has(Number(u.port)) || u.username || u.password) fail();
  return originalFetch(input, init);
 };
}
if (require.main !== module && process.env.DIMORA_OFFLINE_MODE) install();
module.exports = { install };
