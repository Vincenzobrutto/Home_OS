// Pure measurer for the synthetic pilot corpus v2. No dist, provider, database or network.
// Its numbers describe agreement between supplied observations and annotations: they are NOT provider accuracy.
// Citation and value checks mirror the current validators, re-implemented here because the worktree has no dist:
//   economy: src/economy/document-domain.ts (citation, validateOutput) and document-evidence.ts (printedCents, printedDates)
//   technical: src/review/ai-evidence.ts (validateEvidence) and src/review/domain.ts (decimal, proposalKind)
// pilot-corpus.test.cjs cross-checks printedCents/printedDates against the compiled ones when dist exists.

const ECONOMIC_FIELDS = ['title', 'supplier', 'category', 'documentNumber', 'documentDate', 'competenceFrom', 'competenceTo', 'dueOn'];
const DATE_FIELDS = ['documentDate', 'competenceFrom', 'competenceTo', 'dueOn'];
const AMOUNT_ROLES = ['current_document_total', 'amount_due', 'arrears_balance', 'taxable', 'tax', 'line_total', 'other'];
const TECHNICAL_FIELDS = ['brand', 'model', 'power'];
const CATEGORY_LABELS = { electricity: /elettric|electric/, gas: /\bgas\b/, water: /acqua|water/, internet_services: /internet/, maintenance: /manutenzion/, repairs_works: /riparazion/, purchase_replacement: /acquisto|sostituzion/ };
const MAX_EXCERPT = 2000;

/** NFC + collapsed whitespace + trim, case preserved (same as both validators). */
const normalized = (value) => value.normalize('NFC').replace(/\s+/gu, ' ').trim();

function calendarValid(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number), leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return y >= 1 && m >= 1 && m <= 12 && d >= 1 && d <= days[m - 1];
}

/** Copy of document-evidence.printedCents: printed two-decimal non-negative amounts in cents. */
function printedCents(excerpt) {
  const values = [];
  for (const match of excerpt.matchAll(/(?<![\d.,])[-−+]?\d(?:[\d.,\u00a0\u202f ]*\d)?[.,]\d{2}(?![\d.,])/gu)) {
    const [raw] = match;
    if (/^[-−]/u.test(raw) || /[-−(]\s*$/u.test(excerpt.slice(0, match.index))) continue;
    const value = raw.replace(/^\+/, ''), decimal = value.at(-3);
    const whole = value.slice(0, -3), fraction = value.slice(-2);
    const escaped = decimal === ',' ? '\\.' : ',';
    if (!/^\d+$/.test(whole) && !new RegExp('^\\d{1,3}(?:' + escaped + '\\d{3})+$').test(whole) && !/^\d{1,3}(?:[\u00a0\u202f ]\d{3})+$/.test(whole)) continue;
    const cents = BigInt(whole.replace(/[.,\u00a0\u202f ]/gu, '')) * 100n + BigInt(fraction);
    if (cents <= 999999999n) values.push(Number(cents));
  }
  return values;
}

/** Copy of document-evidence.printedDates: ISO, DD/MM/YYYY (/ . -) and Italian month names. */
function printedDates(excerpt) {
  const dates = new Set(); const add = (v) => { if (calendarValid(v)) dates.add(v); };
  for (const [date] of excerpt.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)) add(date);
  for (const m of excerpt.matchAll(/\b(\d{1,2})([/.-])(\d{1,2})\2(\d{4})\b/g)) add(`${m[4]}-${m[3].padStart(2, '0')}-${m[1].padStart(2, '0')}`);
  const months = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  for (const m of excerpt.toLocaleLowerCase('it').matchAll(/\b(\d{1,2})\s+([a-z]+)\s+(\d{4})\b/g)) {
    const month = months.indexOf(m[2]) + 1;
    if (month) add(`${m[3]}-${String(month).padStart(2, '0')}-${m[1].padStart(2, '0')}`);
  }
  return [...dates];
}

/** Copy of review/domain.decimal: canonical positive decimal, or null. */
function decimal(input) {
  if (typeof input !== 'string' || !/^\d{1,12}(\.\d{1,6})?$/.test(input) || Number(input) <= 0) return null;
  const [whole, fraction] = input.split('.'); const tail = (fraction || '').replace(/0+$/, '');
  return whole.replace(/^0+(?=\d)/, '') + (tail ? '.' + tail : '');
}

const quantityCodeFor = (label) => label === 'Potenza utile al riscaldamento' ? 'useful_heating' : label === 'Potenza nominale riportata' ? 'reported_nominal' : 'other';
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Every citation must be on an existing page and contained in it (case-sensitive after NFC/whitespace). */
function citationProblem(source, pages) {
  if (!Number.isSafeInteger(source.page) || source.page < 1 || source.page > pages.length) return 'page_out_of_range';
  if (typeof source.excerpt !== 'string' || ![...source.excerpt].length || [...source.excerpt].length > MAX_EXCERPT) return 'excerpt_invalid';
  if (!normalized(pages[source.page - 1]).includes(normalized(source.excerpt))) return 'excerpt_not_on_page';
  return null;
}

/** Returns null when the fact is proven like the pipeline validator would, otherwise the first reason. */
function proofProblem(fact, pages, pipeline) {
  if (!Array.isArray(fact.sources) || !fact.sources.length) return 'no_sources';
  for (const source of fact.sources) { const problem = citationProblem(source, pages); if (problem) return problem; }
  if (pipeline === 'economic') {
    if (fact.field === 'amount') return fact.sources.flatMap(s => printedCents(s.excerpt)).includes(fact.value) ? null : 'value_not_proven';
    const claims = fact.sources.map(s => normalized(s.excerpt).toLocaleLowerCase('it')).join(' ');
    if (fact.field === 'category') return CATEGORY_LABELS[fact.value]?.test(claims) ? null : 'value_not_proven';
    if (DATE_FIELDS.includes(fact.field)) return fact.sources.some(s => printedDates(s.excerpt).includes(fact.value)) ? null : 'value_not_proven';
    return claims.includes(normalized(String(fact.value)).toLocaleLowerCase('it')) ? null : 'value_not_proven';
  }
  if (pipeline === 'technical') {
    for (const source of fact.sources) {
      const excerpt = normalized(source.excerpt);
      if (fact.field !== 'power') { if (!excerpt.includes(normalized(fact.value))) return 'value_not_proven'; continue; }
      if (quantityCodeFor(fact.quantityLabel) !== fact.quantityCode) return 'quantity_code_mismatch';
      if (!excerpt.includes(normalized(fact.quantityLabel))) return 'quantity_label_not_in_excerpt';
      const printed = [...excerpt.matchAll(new RegExp(`${escapeRe(fact.quantityLabel)}\\s*[:=–-]?\\s*(\\d+(?:[.,]\\d+)?)\\s*kW(?!\\w)`, 'gu'))].map(m => decimal(m[1].replace(',', '.')));
      if (!printed.includes(fact.value)) return 'value_not_proven';
    }
    return null;
  }
  return 'pipeline_without_facts';
}

const sameKind = (gold, fact) => gold.field === fact.field && (fact.field !== 'amount' || gold.role === fact.role) && (fact.field !== 'power' || gold.quantityCode === fact.quantityCode);
const sameValue = (gold, fact) => fact.field === 'power' ? decimal(String(gold.value)) === fact.value : fact.field === 'amount' ? gold.value === fact.value : normalized(String(gold.value)) === normalized(String(fact.value));
const anchored = (gold, fact) => !gold.anchor || fact.sources.some(s => normalized(s.excerpt).includes(gold.anchor));
const identity = (fact) => JSON.stringify([fact.field, fact.role ?? null, fact.quantityCode ?? null, fact.value, fact.sources.map(s => [s.page, normalized(s.excerpt)]).sort()]);

const SAFE_BLOCKS = ['evidence_unverified', 'analysis_invalid_output', 'analysis_limits_exceeded', 'multi_assets_unsupported', 'pdf_text_unavailable', 'pdf_invalid', 'pdf_encrypted', 'no_supported_data', 'no_supported_economic_data'];
const NOT_EVALUABLE = ['provider_unavailable', 'provider_rate_limited', 'provider_auth_failed', 'analysis_timeout', 'analysis_outcome_unknown', 'storage_unavailable', 'ai_budget_exhausted'];
const CRITICAL_KINDS = ['quantity_interpretation', 'value_conflict'];

function proposalKind(field, facts) {
  // Like validateEvidence: repeated claims/sources do not create new candidates.
  const list = [...new Map(facts.filter(f => f.field === field).map(f => [JSON.stringify([f.value, f.quantityCode ?? null, f.quantityLabel ?? null]), f])).values()];
  if (!list.length) return 'none';
  if (list.length === 1) return 'single_value';
  return field === 'power' && new Set(list.map(f => f.quantityCode)).size === list.length ? 'quantity_interpretation' : 'value_conflict';
}

/**
 * Scores one normalized observation (see pilot-observations.cjs) against one corpus case.
 * `pages` is the expected page text of the case (corpus), never text supplied by the observation.
 */
function scoreCase(item, pages, observation) {
  const result = { caseId: item.id, pipeline: item.pipeline, expectedOutcome: item.expected.outcome, missing: !observation };
  if (!observation) return result;
  const actual = observation.outcome; const expected = item.expected.outcome;
  const counts = { required: item.required.length, requiredMatched: 0, allowedMatched: 0, wrong: 0, unexpected: 0, unsupported: 0, duplicate: 0, forbidden: 0, omitted: 0 };
  const criticals = [], details = [];
  Object.assign(result, { actualOutcome: actual, counts, criticals, details });

  if (NOT_EVALUABLE.includes(actual)) { result.notEvaluable = true; counts.omitted = item.required.length; return result; }
  result.outcomeMatch = actual === expected;
  if (expected === 'proposal') {
    // A refusal publishes nothing (safe block), but it is never a correct extraction. When a proposal is
    // published on a positive case, system safety is not applicable: risks are reported as criticals.
    result.positiveRejected = actual !== 'proposal';
    result.systemSafe = result.positiveRejected ? true : null;
  } else if (item.pipeline === 'parser') {
    result.systemSafe = actual !== 'proposal';
  } else {
    result.systemSafe = actual !== 'proposal';
    if (!result.outcomeMatch && SAFE_BLOCKS.includes(actual)) result.blockedBySystem = true;
    if (actual === 'proposal') criticals.push({ kind: 'negative_published' });
  }

  const facts = actual === 'proposal' ? observation.facts : [];
  const golds = [...item.required.map(g => ({ ...g, tag: 'required' })), ...item.allowed.map(g => ({ ...g, tag: 'allowed' }))];
  const matched = new Set(), seen = new Set();
  for (const fact of facts) {
    const id = identity(fact);
    if (seen.has(id)) { counts.duplicate++; details.push({ fact, verdict: 'duplicate' }); continue; }
    seen.add(id);
    if (item.absent.includes(fact.field)) { counts.forbidden++; details.push({ fact, verdict: 'forbidden' }); criticals.push({ kind: 'forbidden_field', field: fact.field }); continue; }
    const candidates = golds.map((g, i) => [g, i]).filter(([g]) => sameKind(g, fact) && sameValue(g, fact) && anchored(g, fact));
    if (candidates.length) {
      const problem = proofProblem(fact, pages, item.pipeline);
      if (problem) { counts.unsupported++; details.push({ fact, verdict: 'unsupported', reason: problem }); continue; }
      const free = candidates.find(([, i]) => !matched.has(i));
      if (!free) { counts.duplicate++; details.push({ fact, verdict: 'duplicate' }); continue; }
      matched.add(free[1]);
      if (free[0].tag === 'required') counts.requiredMatched++; else counts.allowedMatched++;
      details.push({ fact, verdict: free[0].tag });
      continue;
    }
    if (fact.field === 'amount' && golds.some(g => g.field === 'amount' && g.role !== fact.role && g.value === fact.value)) criticals.push({ kind: 'amount_role_swap', role: fact.role, value: fact.value });
    const kindKnown = golds.some(g => sameKind(g, fact));
    const proofOk = !proofProblem(fact, pages, item.pipeline);
    if (kindKnown) { counts.wrong++; details.push({ fact, verdict: 'wrong', proven: proofOk }); }
    else { counts.unexpected++; details.push({ fact, verdict: 'unexpected', proven: proofOk }); }
  }
  counts.omitted = item.required.length - counts.requiredMatched;

  if (actual === 'proposal' && expected === 'proposal') {
    if (item.expected.documentKind && observation.documentKind !== item.expected.documentKind) details.push({ verdict: 'property_mismatch', property: 'documentKind', expected: item.expected.documentKind, actual: observation.documentKind });
    if (typeof item.expected.amountSelectionRequired === 'boolean' && observation.amountSelectionRequired !== item.expected.amountSelectionRequired) criticals.push({ kind: 'amount_selection_flag', expected: item.expected.amountSelectionRequired, actual: observation.amountSelectionRequired });
    for (const [fieldName, kind] of Object.entries(item.expected.proposalKinds ?? {})) {
      const got = proposalKind(fieldName, facts);
      if (got !== kind) (CRITICAL_KINDS.includes(kind) ? criticals : details).push({ kind: kind === 'value_conflict' ? 'conflict_not_preserved' : kind === 'quantity_interpretation' ? 'quantities_not_distinct' : 'proposal_kind_mismatch', verdict: 'proposal_kind_mismatch', field: fieldName, expected: kind, actual: got });
    }
  }
  if (item.future.length) result.notMeasurable = item.future;
  return result;
}

/** Aggregation without statistical claims. Ratios are agreement with annotations on the supplied sample. */
function aggregate(results, provenance) {
  const evaluated = results.filter(r => !r.missing && !r.notEvaluable);
  const sum = (key) => evaluated.reduce((total, r) => total + (r.counts?.[key] ?? 0), 0);
  const totals = Object.fromEntries(['required', 'requiredMatched', 'allowedMatched', 'wrong', 'unexpected', 'unsupported', 'duplicate', 'forbidden', 'omitted'].map(k => [k, sum(k)]));
  const proposed = totals.requiredMatched + totals.allowedMatched + totals.wrong + totals.unexpected + totals.unsupported + totals.forbidden;
  return {
    measurerOnly: provenance?.kind !== 'provider_campaign',
    sample: { cases: results.length, evaluated: evaluated.length, missing: results.filter(r => r.missing).map(r => r.caseId), notEvaluable: results.filter(r => r.notEvaluable).map(r => r.caseId) },
    totals,
    agreementWithAnnotations: proposed ? (totals.requiredMatched + totals.allowedMatched) / proposed : null,
    requiredCoverage: totals.required ? totals.requiredMatched / totals.required : null,
    outcomes: evaluated.map(r => ({ caseId: r.caseId, expected: r.expectedOutcome, actual: r.actualOutcome, outcomeMatch: r.outcomeMatch, systemSafe: r.systemSafe, positiveRejected: !!r.positiveRejected, blockedBySystem: !!r.blockedBySystem })),
    criticals: evaluated.flatMap(r => r.criticals.map(c => ({ caseId: r.caseId, ...c }))),
    propertyMismatches: evaluated.flatMap(r => r.details.filter(d => d.verdict === 'property_mismatch').map(d => ({ caseId: r.caseId, ...d }))),
    warnings: [
      ...(proposed === 0 && evaluated.length ? ['Nessun fatto proposto: nessuna conclusione sull’utilità o sull’affidabilità può essere tratta.'] : []),
      `Campione di ${results.length} casi sintetici: nessuna soglia statistica; ogni rapporto è accordo con le annotazioni, non accuratezza del provider.`,
    ],
  };
}

module.exports = { ECONOMIC_FIELDS, DATE_FIELDS, AMOUNT_ROLES, TECHNICAL_FIELDS, normalized, printedCents, printedDates, decimal, quantityCodeFor, citationProblem, proofProblem, proposalKind, scoreCase, aggregate, SAFE_BLOCKS, NOT_EVALUABLE };
