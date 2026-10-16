// No network, provider or database. Prints the corpus v2 manifest and, optionally, scores a local
// observation file in format v2. providerCalled comes only from the declared provenance, never from
// the mere presence of a file. Ratios are agreement with annotations, not provider accuracy.
const { readFile } = require('node:fs/promises');
const corpus = require('../test/pilot-corpus.cjs');
const { scoreCase, aggregate } = require('../test/pilot-score.cjs');
const { parseObservations, ObservationFormatError, OBSERVATION_FORMAT, OBSERVATION_VERSION } = require('../test/pilot-observations.cjs');

async function main() {
  const args = process.argv.slice(2);
  if (args.length && !(args.length === 2 && args[0] === '--observations')) throw new ObservationFormatError('invalid_arguments', 'usage: [--observations <file>]');
  const fixtures = await Promise.all(corpus.cases.map(item => corpus.materialize(item)));
  const hashes = new Map(fixtures.map(f => [f.id, f.sha256]));
  const report = {
    format: 'dimora-v5-pilot-corpus-report', formatVersion: 2,
    corpus: { format: corpus.CORPUS_FORMAT, version: corpus.CORPUS_VERSION, synthetic: true },
    observationFormat: { format: OBSERVATION_FORMAT, version: OBSERVATION_VERSION },
    cases: fixtures.map(f => ({ id: f.id, group: f.group, pipeline: f.pipeline, sha256: f.sha256, byteSize: f.bytes.length, format: f.format, expected: f.expected, required: f.required, allowed: f.allowed, absent: f.absent, notMeasurable: f.future })),
    observations: null,
  };
  if (args.length) {
    const doc = JSON.parse(await readFile(args[1], 'utf8'));
    const { provenance, byCase, missing } = parseObservations(doc, corpus, hashes);
    const results = corpus.cases.map(item => scoreCase(item, corpus.pages(item), byCase.get(item.id)));
    report.observations = {
      provenance: { kind: provenance.kind, providerCalled: provenance.providerCalled, stage: provenance.stage, description: provenance.description ?? null },
      providerAccuracy: provenance.kind === 'provider_campaign' ? 'per_case_only_small_synthetic_sample' : null,
      summary: aggregate(results, provenance),
      perCase: results,
    };
    if (missing.length) process.exitCode = 1;
  }
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  const code = error instanceof ObservationFormatError ? error.message : 'unexpected_error';
  console.error(`Corpus report non completato (${code}). Nessuna metrica prodotta, nessuna richiesta inviata.`);
  process.exitCode = 1;
});
