'use strict';
// One explicit suite and one exact alternate loopback DB. Ownership/network checks remain unchanged.
process.env.DIMORA_OFFLINE_SECONDARY='agency-manual-room';
const runner=require('./offline.cjs');
const options=runner.parseArgs(process.argv.slice(2));
if(options.suite!=='test:agency-http-db')throw Error('secondary_suite_forbidden');
runner.run(options).catch(()=>{console.error('secondary_offline_runner_failed');process.exitCode=1;});
