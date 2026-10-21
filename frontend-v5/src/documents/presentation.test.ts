import { describe, expect, it } from 'vitest';
import type { DocumentSummary } from '../api/types';
import { documentDisplayTitle, documentTypeLabels } from './presentation';

describe('presentazione dei documenti senza modificare i dati', () => {
  const organization: NonNullable<DocumentSummary['organization']> = {
    title: 'Bolletta dicembre 2025', version: 1, parts: [{ kind: 'floor_plan', pageFrom: null, pageTo: null }],
    collections: ['building'], origin: 'user_declared', updatedAt: '2026-10-20T12:00:00Z',
  };
  it('preferisce il titolo confermato al nome a codice e preserva i titoli leggibili', () => {
    expect(documentDisplayTitle({ name: '26e90b5602ac295807c9c20932b85b70.pdf', organization })).toBe('Bolletta dicembre 2025');
    expect(documentDisplayTitle({ name: 'Fattura idraulico' })).toBe('Fattura idraulico');
    expect(documentDisplayTitle({ name: '26e90b5602ac295807c9c20932b85b70.pdf' })).toBe('Documento collegato');
  });
  it('distingue planimetrie e pratiche anche nei documenti misti', () => {
    expect(documentTypeLabels(organization)).toEqual(['Planimetria']);
    expect(documentTypeLabels({ ...organization, parts: [...organization.parts, { kind: 'cila', pageFrom: 2, pageTo: 3 }] })).toEqual(['Planimetria', 'CILA']);
    expect(documentTypeLabels({ ...organization, parts: [] })).toEqual(['Pratiche edilizie e catastali']);
  });
});

it('archive fallback for hash-only titles never replaces a readable or confirmed title',()=>{
 expect(documentDisplayTitle({name:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.pdf'},'Documento senza titolo')).toBe('Documento senza titolo');expect(documentDisplayTitle({name:'Contratto di locazione'},'Documento senza titolo')).toBe('Contratto di locazione');
});
