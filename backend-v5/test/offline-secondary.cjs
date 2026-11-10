'use strict';
// Explicit named suites and one exact alternate loopback DB. Ownership/network checks remain unchanged.
process.env.DIMORA_OFFLINE_SECONDARY='agency-manual-room';
const runner=require('./offline.cjs');
const options=runner.parseArgs(process.argv.slice(2));
if(!['test:agency-http-db','test:agency-gift-db','test:agency-gift-runner-db','test:agency-gift-browser-trial','test:home-map-drag-db','test:ambienti-map-browser-trial','test:ambienti-map-followup-trial','test:gift-simple-browser-20261103','test:gift-simple-user-trial-20261103'].includes(options.suite))throw Error('secondary_suite_forbidden');
runner.run(options).catch(()=>{console.error('secondary_offline_runner_failed');process.exitCode=1;});
