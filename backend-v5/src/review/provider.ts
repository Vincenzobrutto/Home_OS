import { Injectable } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Candidate, FieldKey, Measurement, SourceRef, candidate } from './domain';
import { digest } from '../security';
export type Snapshot = { documentId: string; documentVersion: 1; documentSha256: string };
type Fixture = { sha256: string; brand: { value: string; page: 1; excerpt: string }; model: { value: string; page: 1; excerpt: string }; power: Measurement & { page: 1; excerpt: string } };
export class ProviderFailure extends Error { constructor(public readonly code: string) { super(code); } }
@Injectable()
export class FixtureProvider {
  async analyze(documents: Array<{ snapshot: Snapshot; bytes: Buffer }>): Promise<Record<FieldKey, Candidate[]>> {
    const manifest = JSON.parse(await readFile(resolve(__dirname, '../../../docs/v5/fixtures/m3/manifest.json'), 'utf8')) as { fixtures: Fixture[] };
    const groups: Record<FieldKey, Map<string, Candidate>> = { brand: new Map(), model: new Map(), power: new Map() };
    for (const { snapshot, bytes } of documents) {
      if (digest(bytes) !== snapshot.documentSha256) throw new ProviderFailure('storage_unavailable');
      const fixture = manifest.fixtures.find(f => f.sha256 === snapshot.documentSha256);
      if (!fixture) throw new ProviderFailure('provider_fixture_unsupported');
      for (const field of ['brand', 'model', 'power'] as const) {
        const data = fixture[field]; const source: SourceRef = { ...snapshot, page: data.page, excerpt: data.excerpt };
        const measurement: Measurement | undefined = field === 'power' ? { value: fixture.power.value, unit: fixture.power.unit, quantityCode: fixture.power.quantityCode, quantityLabel: fixture.power.quantityLabel } : undefined;
        const key = JSON.stringify([data.value, measurement]); const prior = groups[field].get(key);
        if (prior) prior.sources.push(source); else groups[field].set(key, candidate(data.value, [source], measurement));
      }
    }
    return { brand: [...groups.brand.values()], model: [...groups.model.values()], power: [...groups.power.values()] };
  }
}
