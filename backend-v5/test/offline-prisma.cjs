'use strict';
// Prisma's native engine does not use node:net. Validate its construction too,
// before an engine can receive an explicit URL that bypasses process defaults.
const Module = require('node:module');
const { DB_URL, assertOfflineDatabase } = require('./offline-policy.cjs');
function installPrismaGuard(mode) {
 const load = Module._load, wrapped = new WeakMap();
 Module._load = function (request, parent, isMain) {
  const resolved = Module._resolveFilename(request, parent).replaceAll('\\', '/');
  const relevant = resolved.includes('/generated/client/') || resolved.includes('/@prisma/client/');
  const result = load.call(this, request, parent, isMain);
  if (!relevant || !result || !Object.hasOwn(result, 'PrismaClient') || typeof result.PrismaClient !== 'function') return result;
  if (wrapped.has(result)) return wrapped.get(result);
  const Original = result.PrismaClient;
  class OfflinePrismaClient extends Original {
   constructor(options) {
    if (mode !== 'db') throw Error('offline_database_forbidden');
    assertOfflineDatabase(process.env.DATABASE_URL);
    if (options?.adapter || options?.accelerateUrl || options?.__internal) throw Error('offline_database_forbidden');
    if (options?.datasourceUrl !== undefined) assertOfflineDatabase(options.datasourceUrl);
    for (const source of Object.values(options?.datasources ?? {})) assertOfflineDatabase(source?.url);
    if (options?.datasources !== undefined && (Object.keys(options.datasources).length !== 1 || !options.datasources.db)) throw Error('offline_database_forbidden');
    super(options?.datasources ? options : { ...options, datasourceUrl: DB_URL });
   }
  }
  const guarded = { ...result, PrismaClient: OfflinePrismaClient };
  wrapped.set(result, guarded); wrapped.set(guarded, guarded);
  return guarded;
 };
}
module.exports = { installPrismaGuard };
