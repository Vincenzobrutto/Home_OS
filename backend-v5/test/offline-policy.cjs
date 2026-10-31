'use strict';
const fs = require('node:fs');
const path = require('node:path');
// A second fixed, equally guarded port allows geometry API tests while a user trial owns 55439.
const SECONDARY = process.env.DIMORA_OFFLINE_SECONDARY === 'agency-manual-room';
const DB_PORT = SECONDARY ? 55440 : 55439, API_PORT = 3119;
const DB_URL = `postgresql://quality_test@127.0.0.1:${DB_PORT}/dimora_v5_quality_v3_test`;
function assertOfflineDatabase(raw) {
 if (raw !== DB_URL) throw Error('offline_database_forbidden');
}
function cleanEnvironment(parent, mode, runDir, token) {
 const env = {};
 if(SECONDARY)env.DIMORA_OFFLINE_SECONDARY='agency-manual-room';
 const allowed = /^(?:path|systemroot|windir|comspec|pathext|temp|tmp|userprofile|appdata|localappdata|programdata|programfiles|programfiles\(x86\)|systemdrive|homedrive|homepath)$/i;
 for (const [key, value] of Object.entries(parent)) if (allowed.test(key)) env[key] = value;
 Object.assign(env, { M4_AI_ENABLED: 'false', ONBOARDING_AI_ENABLED: 'false', DIMORA_OFFLINE_MODE: mode });
 if (mode === 'db') {
  Object.assign(env, { DATABASE_URL: DB_URL, QUALITY_V3_DATABASE_URL: DB_URL, DIMORA_OFFLINE_RUN_DIR: runDir, DIMORA_OFFLINE_TOKEN: token });
 }
 env.NODE_OPTIONS = '--require="' + path.join(__dirname, 'offline-network.cjs').replaceAll('\\', '/') + '"';
 return env;
}
function assertOwnedRun(runDir, token) {
 if (!runDir || !token) throw Error('offline_run_required');
 const marker = JSON.parse(fs.readFileSync(path.join(runDir, 'offline-owner.json'), 'utf8'));
 if (marker.token !== token || marker.directory !== path.resolve(runDir) || marker.databaseUrl !== DB_URL) throw Error('offline_owner_mismatch');
 return marker;
}
module.exports = { DB_URL, DB_PORT, API_PORT, assertOfflineDatabase, cleanEnvironment, assertOwnedRun };
