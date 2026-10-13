import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

// Each batch stays below the application's 15 authentication attempts/minute.
// Keep the real protection enabled; a full run now includes four H1 accounts.
const groups = [
  ['identity', 'documents', 'review'],
  ['anthropic', 'activities'],
];
const environment = { ...process.env, V5_ANTHROPIC_LIVE: '0' };
const args = process.argv.slice(2);
if (process.env.V5_API_URL) {
  console.log('Attesa iniziale di 61 secondi: separa queste prove da precedenti test API o accessi locali.');
  await delay(61000);
}
for (let index = 0; index < groups.length; index++) {
  if (index) {
    console.log('Attesa di 61 secondi tra i gruppi: mantiene il limite reale di autenticazione. Nessuna chiamata AI live.');
    await delay(61000);
  }
  const files = groups[index].map(name => `tests/integration/${name}.int.test.ts`);
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', '--project', 'integration', '--maxWorkers=1', ...files, ...args], { stdio: 'inherit', env: environment });
    child.on('error', reject);
    child.on('exit', (status, signal) => resolve(signal ? 1 : status ?? 1));
  });
  if (code) { process.exitCode = code; break; }
}
