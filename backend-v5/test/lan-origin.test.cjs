const { test } = require('node:test'), assert = require('node:assert/strict');
const { expectedSessionOrigin, assertCsrf } = require('../dist/security');
test('phone origin is exact, explicit, private, development only; CSRF remains mandatory', () => {
  const lan = 'http://192.168.1.66:5175', local = 'http://127.0.0.1:5174', token = 'x'.repeat(43), env = { DIMORA_LAN_ORIGIN: lan };
  assert.equal(expectedSessionOrigin(lan, env), lan);
  assert.equal(expectedSessionOrigin(local, env), local);
  assert.equal(expectedSessionOrigin(lan, {}), local);
  assert.equal(expectedSessionOrigin(lan, { ...env, NODE_ENV: 'production' }), local);
  for (const origin of ['http://192.168.1.67:5175', 'http://192.168.1.66:5176', 'https://evil.test', undefined]) {
    assert.throws(() => assertCsrf({ headers: { origin, 'x-csrf-token': token } }, token, expectedSessionOrigin(origin, env)), e => e.getStatus() === 403);
  }
  assert.doesNotThrow(() => assertCsrf({ headers: { origin: lan, 'x-csrf-token': token } }, token, expectedSessionOrigin(lan, env)));
  assert.throws(() => assertCsrf({ headers: { origin: lan } }, token, expectedSessionOrigin(lan, env)), e => e.getStatus() === 403);
  for (const bad of ['http://8.8.8.8:5175', 'http://127.0.0.1:5175', 'http://192.168.1.66:5175/', 'http://192.168.1.66:5175/path', 'http://192.168.1.66:5175?x', 'http://evil.test:5175']) assert.equal(expectedSessionOrigin(bad, { DIMORA_LAN_ORIGIN: bad }), local);
});
