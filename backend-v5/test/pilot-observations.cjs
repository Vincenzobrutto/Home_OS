// Observation format v2 for the pilot corpus, and its strict adapter. No provider calls.
// Input shapes are the outputs of the CURRENT validators, after validation:
//   economic: EconomicOutput returned by validateOutput() (src/economy/document-domain.ts)
//   technical: Record<FieldKey, Candidate[]> returned by validateEvidence() (src/review/ai-evidence.ts)
//   parser: only the outcome code of PdfTextExtractor.extract() (src/review/pdf-text.ts)
// Anything incompatible is rejected with an explicit code instead of producing silent metrics.
const { ECONOMIC_FIELDS, AMOUNT_ROLES, TECHNICAL_FIELDS, quantityCodeFor, decimal } = require('./pilot-score.cjs');

const OBSERVATION_FORMAT = 'dimora-v5-pilot-observations';
const OBSERVATION_VERSION = 2;
const PROVENANCE_KINDS = ['hand_built', 'deterministic_fixture', 'provider_campaign'];
const FAILURES = ['evidence_unverified', 'analysis_invalid_output', 'analysis_limits_exceeded', 'pdf_text_unavailable', 'pdf_invalid', 'pdf_encrypted', 'provider_unavailable', 'provider_rate_limited', 'provider_auth_failed', 'analysis_timeout', 'analysis_outcome_unknown', 'storage_unavailable', 'ai_budget_exhausted'];
const OUTCOMES = {
  economic: ['proposal', 'no_supported_economic_data', ...FAILURES],
  technical: ['proposal', 'no_supported_data', 'multi_assets_unsupported', ...FAILURES],
  parser: ['text_extracted', 'pdf_text_unavailable', 'pdf_invalid', 'pdf_encrypted', 'analysis_limits_exceeded'],
};

class ObservationFormatError extends Error {
  constructor(code, detail) { super(`${code}${detail ? ': ' + detail : ''}`); this.code = code; this.detail = detail; }
}
const fail = (code, detail) => { throw new ObservationFormatError(code, detail); };
const isObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
function keys(value, allowed, where) {
  if (!isObject(value)) fail('invalid_shape', where);
  const extra = Object.keys(value).filter(k => !allowed.includes(k));
  if (extra.length) fail('unknown_key', `${where}: ${extra.join(', ')}`);
  return value;
}
const sha = (v) => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);

/** Citation from a validated output, bound to the observed document hash when it carries one. */
function source(raw, documentSha256, where) {
  const s = keys(raw, ['documentId', 'documentVersion', 'sha256', 'documentSha256', 'page', 'excerpt'], where);
  for (const bound of [s.sha256, s.documentSha256]) {
    if (bound !== undefined && bound !== documentSha256) fail('source_hash_mismatch', where);
  }
  if (!Number.isSafeInteger(s.page) || typeof s.excerpt !== 'string') fail('invalid_source', where);
  return { page: s.page, excerpt: s.excerpt };
}
function sources(raw, documentSha256, where) {
  if (!Array.isArray(raw) || !raw.length || raw.length > 10) fail('invalid_sources', where);
  return raw.map((s, i) => source(s, documentSha256, `${where}.sources[${i}]`));
}

function economicFacts(raw, documentSha256, where) {
  const e = keys(raw, ['documentKind', 'proposedFields', 'amountCandidates', 'amountSelectionRequired'], where);
  if (e.documentKind !== 'utility_bill' && e.documentKind !== 'simple_invoice') fail('invalid_document_kind', where);
  const facts = [];
  for (const [name, value] of Object.entries(keys(e.proposedFields ?? {}, ECONOMIC_FIELDS, `${where}.proposedFields`))) {
    const p = keys(value, ['value', 'sources'], `${where}.proposedFields.${name}`);
    if (typeof p.value !== 'string' || !p.value.trim()) fail('invalid_value', `${where}.proposedFields.${name}`);
    facts.push({ field: name, value: p.value, sources: sources(p.sources, documentSha256, `${where}.proposedFields.${name}`) });
  }
  if (!Array.isArray(e.amountCandidates) || !e.amountCandidates.length || e.amountCandidates.length > 10) fail('invalid_amount_candidates', where);
  e.amountCandidates.forEach((raw, i) => {
    const c = keys(raw, ['id', 'amountCents', 'role', 'label', 'sources'], `${where}.amountCandidates[${i}]`);
    if (!AMOUNT_ROLES.includes(c.role)) fail('unknown_role', `${where}.amountCandidates[${i}]`);
    if (!Number.isSafeInteger(c.amountCents) || c.amountCents <= 0) fail('invalid_amount', `${where}.amountCandidates[${i}]`);
    // The provider id is not part of the identity of a fact.
    facts.push({ field: 'amount', role: c.role, value: c.amountCents, sources: sources(c.sources, documentSha256, `${where}.amountCandidates[${i}]`) });
  });
  const amounts = facts.filter(f => f.field === 'amount');
  const recomputed = amounts.some(f => f.role === 'arrears_balance') || amounts.filter(f => f.role === 'current_document_total').length !== 1;
  if (e.amountSelectionRequired !== recomputed) fail('inconsistent_with_validator', `${where}.amountSelectionRequired`);
  return { documentKind: e.documentKind, amountSelectionRequired: e.amountSelectionRequired, facts };
}

function technicalFacts(raw, documentSha256, where) {
  const t = keys(raw, TECHNICAL_FIELDS, where); const facts = [];
  for (const name of TECHNICAL_FIELDS) {
    const list = t[name] ?? [];
    if (!Array.isArray(list)) fail('invalid_shape', `${where}.${name}`);
    list.forEach((rawCandidate, i) => {
      const at = `${where}.${name}[${i}]`;
      const c = keys(rawCandidate, ['id', 'value', 'sources', 'measurement'], at);
      if (typeof c.value !== 'string' || !c.value.trim()) fail('invalid_value', at);
      const fact = { field: name, value: c.value, sources: sources(c.sources, documentSha256, at) };
      if (name === 'power') {
        const m = keys(c.measurement, ['value', 'unit', 'quantityCode', 'quantityLabel'], `${at}.measurement`);
        if (m.unit !== 'kW' || decimal(m.value) !== m.value || m.value !== c.value) fail('invalid_measurement', at);
        if (typeof m.quantityLabel !== 'string' || quantityCodeFor(m.quantityLabel) !== m.quantityCode) fail('inconsistent_with_validator', `${at}.quantityCode`);
        Object.assign(fact, { quantityCode: m.quantityCode, quantityLabel: m.quantityLabel });
      } else if (c.measurement !== undefined) fail('unknown_key', `${at}.measurement`);
      facts.push(fact);
    });
  }
  return { facts };
}

/**
 * Validates an observation document against the corpus. Returns { provenance, byCase, missing }.
 * `hashes` maps caseId to the sha256 of the corpus bytes (from materialize()).
 */
function parseObservations(doc, corpus, hashes) {
  if (Array.isArray(doc)) fail('unsupported_format', 'v1 array observations are not reinterpreted; convert them explicitly to format v2');
  keys(doc, ['format', 'formatVersion', 'corpusFormat', 'corpusVersion', 'provenance', 'observations'], 'document');
  if (doc.format !== OBSERVATION_FORMAT || doc.formatVersion !== OBSERVATION_VERSION) fail('unsupported_format', `${doc.format}@${doc.formatVersion}`);
  if (doc.corpusFormat !== corpus.CORPUS_FORMAT || doc.corpusVersion !== corpus.CORPUS_VERSION) fail('corpus_version_mismatch', `${doc.corpusFormat}@${doc.corpusVersion}`);
  const provenance = keys(doc.provenance, ['kind', 'providerCalled', 'stage', 'description'], 'provenance');
  if (!PROVENANCE_KINDS.includes(provenance.kind) || typeof provenance.providerCalled !== 'boolean' || typeof provenance.stage !== 'string' || !provenance.stage) fail('invalid_provenance');
  if ((provenance.kind === 'provider_campaign') !== provenance.providerCalled) fail('invalid_provenance', 'providerCalled must be true only for provider_campaign');
  if (!Array.isArray(doc.observations)) fail('invalid_shape', 'observations');

  const byCase = new Map();
  doc.observations.forEach((raw, index) => {
    const where = `observations[${index}]`;
    const o = keys(raw, ['caseId', 'pipeline', 'documentSha256', 'outcome', 'economic', 'technical'], where);
    const item = corpus.cases.find(c => c.id === o.caseId);
    if (!item) fail('unknown_case', String(o.caseId));
    if (byCase.has(item.id)) fail('duplicate_case', item.id);
    if (o.pipeline !== item.pipeline) fail('pipeline_mismatch', `${item.id}: ${o.pipeline} != ${item.pipeline}`);
    if (!sha(o.documentSha256) || o.documentSha256 !== hashes.get(item.id)) fail('document_hash_mismatch', item.id);
    if (!OUTCOMES[item.pipeline].includes(o.outcome)) fail('unknown_outcome', `${item.id}: ${o.outcome}`);
    const payloadKey = item.pipeline === 'economic' ? 'economic' : item.pipeline === 'technical' ? 'technical' : null;
    const other = payloadKey === 'economic' ? 'technical' : 'economic';
    if (o[other] !== undefined || (payloadKey === null && (o.economic !== undefined || o.technical !== undefined))) fail('payload_pipeline_mismatch', item.id);
    if (o.outcome === 'proposal' && o[payloadKey] === undefined) fail('missing_payload', item.id);
    if (o.outcome !== 'proposal' && payloadKey && o[payloadKey] !== undefined) fail('payload_without_proposal', item.id);
    const normalizedObservation = { outcome: o.outcome, facts: [] };
    if (o.outcome === 'proposal') Object.assign(normalizedObservation, payloadKey === 'economic' ? economicFacts(o.economic, o.documentSha256, `${where}.economic`) : technicalFacts(o.technical, o.documentSha256, `${where}.technical`));
    byCase.set(item.id, normalizedObservation);
  });
  return { provenance, byCase, missing: corpus.cases.filter(c => !byCase.has(c.id)).map(c => c.id) };
}

module.exports = { OBSERVATION_FORMAT, OBSERVATION_VERSION, OUTCOMES, ObservationFormatError, parseObservations };
