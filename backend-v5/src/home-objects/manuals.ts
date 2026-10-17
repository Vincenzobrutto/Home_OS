import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { ServiceUnavailableException } from '@nestjs/common';
import { invalid, object, text } from '../review/domain';

export type ObjectManual = {
  url: string; kind: 'manual' | 'support'; brand: string; reference: string;
  origin: 'manufacturer_page' | 'user_provided'; sourceUrl: string | null;
  checkedAt: string | null; boundVersion: number;
};
export function externalManualUrl(value: unknown): string {
  const raw = text(value, 2000);
  let url: URL;
  try { url = new URL(raw); } catch { throw invalid('Inserisci un collegamento HTTPS valido.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port && url.port !== '443' || !/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}$/iu.test(url.hostname) || [...raw].some(c => c.codePointAt(0)! <= 32 || c === '\\')) throw invalid('Usa un collegamento HTTPS pubblico, senza credenziali.');
  if (url.hostname.endsWith('.localhost') || url.hostname.endsWith('.local')) throw invalid();
  return url.href;
}
const norm = (value: string) => value.normalize('NFC').trim().toLocaleUpperCase('it');
const field = (value: unknown) => text(value, 80).normalize('NFC');
export function manualLookup(input: unknown) {
  const row = object(input, ['brand', 'reference', 'productUrl']);
  const brand = field(row.brand), reference = field(row.reference);
  if (!/^[\p{L}\p{N} ._/-]+$/u.test(reference)) throw invalid('Controlla il riferimento del modello.');
  return { brand, reference, productUrl: row.productUrl === undefined || row.productUrl === null || row.productUrl === '' ? null : externalManualUrl(row.productUrl) };
}
export function manualSelection(input: unknown): { mode: 'candidate'; token: string } | { mode: 'remove' } | { mode: 'manual'; manual: Omit<ObjectManual, 'boundVersion'> } {
  const r = object(input, ['mode', 'token', 'url', 'brand', 'reference', 'kind']);
  if (r.mode === 'remove') { object(input, ['mode']); return { mode: 'remove' }; }
  if (r.mode === 'candidate') { object(input, ['mode', 'token']); return { mode: 'candidate', token: text(r.token, 10000) }; }
  if (r.mode !== 'manual' || !['manual', 'support'].includes(String(r.kind))) throw invalid();
  object(input, ['mode', 'url', 'brand', 'reference', 'kind']);
  return { mode: 'manual', manual: { url: externalManualUrl(r.url), kind: r.kind as 'manual' | 'support', brand: field(r.brand), reference: field(r.reference), origin: 'user_provided', sourceUrl: null, checkedAt: null } };
}

const knownProductPages: Record<string, string> = {
  // Public manufacturer reference, not synthetic fallback data. Every lookup fetches it anew.
  'MOULINEX:AL4018F0': 'https://www.moulinex.it/p/easy-fry-xl-surface-friggitrice-ad-aria-grande-superficie-di-cottura-visore/1510002932',
};
const decodeHtml = (s: string) => s.replace(/&amp;/gu, '&').replace(/&quot;/gu, '"').replace(/&#39;|&apos;/gu, "'");

/** Manufacturer page only; no search engine, image, serial or household data transmitted. */
export class ManufacturerManuals {
  fetchImpl: typeof fetch = fetch;
  private readonly signingKey = randomBytes(32);
  constructor(private readonly now: () => number = Date.now) {}

  private productPage(input: ReturnType<typeof manualLookup>): string | null {
    const candidate = input.productUrl ?? knownProductPages[norm(input.brand) + ':' + norm(input.reference)];
    if (!candidate) return null;
    const url = new URL(candidate);
    // Expand through explicit adapters, never fetch an arbitrary user-controlled host.
    if (norm(input.brand) !== 'MOULINEX' || url.hostname !== 'www.moulinex.it' || !/^\/p\/[^/]+\/\d+$/u.test(url.pathname) || url.search || url.hash) throw invalid('Per ora il recupero automatico supporta le pagine prodotto ufficiali Moulinex. Puoi aggiungere un link manualmente.');
    return url.href;
  }

  async lookup(input: ReturnType<typeof manualLookup>, binding: string) {
    const productUrl = this.productPage(input);
    if (!productUrl) return { candidate: null, reason: 'product_page_needed' };
    const signal = AbortSignal.timeout(10000);
    let html: string;
    try {
      const response = await this.fetchImpl(productUrl, { signal, redirect: 'error', headers: { accept: 'text/html' } });
      if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) throw Error();
      // Bound streaming as well as Content-Length; a hostile response cannot allocate indefinitely.
      if (Number(response.headers.get('content-length') ?? 0) > 2 * 1024 * 1024) throw Error();
      const reader = response.body?.getReader();
      if (!reader) throw Error();
      const chunks: Uint8Array[] = []; let size = 0;
      try { while (true) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.length; if (size > 2 * 1024 * 1024) throw Error(); chunks.push(chunk.value); } }
      finally { await reader.cancel().catch(() => undefined); }
      html = Buffer.concat(chunks).toString('utf8');
    } catch { throw new ServiceUnavailableException({ code: 'manual_lookup_unavailable', message: 'Il sito del produttore non è raggiungibile. Riprova o aggiungi il link manualmente.' }); }
    const products: Record<string, unknown>[] = [];
    for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/giu)) {
      try {
        const parsed = JSON.parse(match[1]);
        for (const r of Array.isArray(parsed) ? parsed : [parsed]) {
          if (r?.['@type'] === 'Product') products.push(r);
          if (Array.isArray(r?.['@graph'])) products.push(...r['@graph'].filter((p: Record<string, unknown>) => p?.['@type'] === 'Product'));
        }
      } catch { /* A page may contain unrelated malformed structured data. */ }
    }
    if (products.length !== 1 || typeof products[0].mpn !== 'string' || norm(products[0].mpn) !== norm(input.reference)) return { candidate: null, reason: 'reference_not_matched' };
    const urls = new Set<string>();
    for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/giu)) {
      const label = decodeHtml(match[2].replace(/<[^>]*>/gu, ' ')).replace(/\s+/gu, ' ').trim();
      if (!/istruzioni\s+per\s+l[’']uso/iu.test(label)) continue;
      try {
        const url = new URL(decodeHtml(match[1]), productUrl);
        if (url.protocol === 'https:' && url.hostname === 'dam.groupeseb.com' && /^\/m\/[^/]+\/original\/[^/]+\.pdf$/iu.test(url.pathname) && !url.username && !url.password && !url.port) urls.add(url.href);
      } catch { /* Unusable links are never returned as manuals. */ }
    }
    if (urls.size !== 1) return { candidate: null, reason: urls.size ? 'ambiguous_manuals' : 'manual_not_found' };
    const manual: Omit<ObjectManual, 'boundVersion'> = { url: [...urls][0], kind: 'manual', brand: input.brand, reference: input.reference, origin: 'manufacturer_page', sourceUrl: productUrl, checkedAt: new Date(this.now()).toISOString() };
    const payload = Buffer.from(JSON.stringify({ binding, expires: this.now() + 15 * 60000, manual })).toString('base64url');
    const token = payload + '.' + createHmac('sha256', this.signingKey).update(payload).digest('base64url');
    return { candidate: { manual, token }, reason: null };
  }

  accept(token: string, binding: string): Omit<ObjectManual, 'boundVersion'> {
    try {
      const [payload, signature, extra] = token.split('.');
      if (!payload || !signature || extra) throw Error();
      const actual = Buffer.from(signature, 'base64url'), expected = createHmac('sha256', this.signingKey).update(payload).digest();
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw Error();
      const record = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      if (record.binding !== binding || record.expires < this.now()) throw Error();
      return record.manual;
    } catch { throw invalid('La proposta è scaduta o la scheda è cambiata. Cerca nuovamente il manuale.'); }
  }
}
