require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('../generated/client');
const { assertDevelopmentDatabase } = require('../dist/prisma.service');
const { AiBudget, committedMicroUsd } = require('../dist/review/ai-budget');
const { ReviewService } = require('../dist/review/review.service');
test('analysis-v2 — ledger PostgreSQL concorrente e risultato vuoto, zero chiamate provider', async t => {
  assertDevelopmentDatabase(process.env.DATABASE_URL);
  const db = new PrismaClient(); await db.$connect();
  const campaign = 'offline-test-' + randomUUID();
  const config = { require: () => ({ input: 2, output: 10 }), campaign, limitMicroUsd: 500000, maxCalls: 6 };
  const budget = new AiBudget(db, config);
  const account = await db.account.create({ data: { name: 'Test ledger sintetico', email: campaign + '@example.test', passwordHash: 'not-a-login-hash' } });
  const home = await db.home.create({ data: { name: 'Casa test ledger', address: 'Indirizzo sintetico' } });
  await db.homeMembership.create({ data: { homeId: home.id, accountId: account.id, role: 'owner', validFrom: new Date(0) } });
  t.after(async () => {
    await db.aiAttempt.deleteMany({ where: { campaignId: campaign } });
    await db.aiCampaign.deleteMany({ where: { id: campaign } });
    await db.analysisJob.deleteMany({ where: { accountId: account.id } });
    await db.assetHistory.deleteMany({ where: { asset: { accountId: account.id } } });
    await db.boilerAsset.deleteMany({ where: { accountId: account.id } });
    await db.home.delete({ where: { id: home.id } }); await db.account.delete({ where: { id: account.id } }); await db.$disconnect();
  });
  const jobs = await Promise.all(Array.from({ length: 6 }, () => db.analysisJob.create({ data: { accountId: account.id, homeId: home.id, documents: [], state: 'failed', provider: 'anthropic', model: 'claude-sonnet-5-5' } })));
  await t.test('Sei richieste concorrenti: due sole riserve entro 0.50 USD, quattro rifiutate', async () => {
    const outcomes = await Promise.allSettled(jobs.map(job => db.$transaction(tx => budget.reserve(tx, job.id, job.model), { maxWait: 15000, timeout: 15000 })));
    assert.equal(outcomes.filter(o => o.status === 'fulfilled').length, 2);
    assert(outcomes.filter(o => o.status === 'rejected').every(o => o.reason.getResponse().code === 'ai_budget_exhausted'));
    const attempts = await db.aiAttempt.findMany({ where: { campaignId: campaign } });
    assert.equal(attempts.reduce((sum, a) => sum + committedMicroUsd(a), 0), 500000);
    assert.equal((await new AiBudget(db, config).snapshot()).remainingUsd, '0.000000');
  });
  await t.test('Nuova istanza dopo invio incerto conserva riserva; fallimento precedente invio libera solo quella', async () => {
    const attempts = await db.aiAttempt.findMany({ where: { campaignId: campaign }, orderBy: { id: 'asc' } });
    await db.aiAttempt.update({ where: { id: attempts[0].id }, data: { state: 'sending' } });
    await budget.fail(attempts[0].jobId); await budget.fail(attempts[1].jobId);
    const saved = await new AiBudget(db, config).snapshot(); assert.equal(saved.uncertainUsd, '0.250000'); assert.equal(saved.remainingUsd, '0.250000');
    await db.$transaction(tx => budget.reserve(tx, jobs.find(j => !attempts.some(a => a.jobId === j.id)).id, 'claude-sonnet-5-5'));
    assert.equal((await budget.snapshot()).remainingUsd, '0.000000');
  });
  await t.test('Zero dati supportati non crea scheda vuota e preserva il target manuale', async () => {
    const review = new ReviewService(db, {});
    const job = jobs[0];
    const outcome = await db.$transaction(tx => review.publish(tx, job, { brand: [], model: [], power: [] }));
    assert.equal(outcome.outcome, 'no_supported_data'); assert.equal(outcome.assetId, null);
    assert.equal(await db.boilerAsset.count({ where: { accountId: account.id } }), 0);
    const asset = await db.boilerAsset.create({ data: { accountId: account.id, homeId: home.id, name: 'Caldaia manuale' } });
    const targeted = await db.$transaction(tx => review.publish(tx, { ...job, assetId: asset.id }, { brand: [], model: [], power: [] }));
    assert.equal(targeted.assetId, asset.id); assert.equal(targeted.openReviewCount, 0);
    assert.equal((await db.boilerAsset.findUnique({ where: { id: asset.id } })).version, asset.version);
  });
});
