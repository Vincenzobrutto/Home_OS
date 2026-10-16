import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ANALYSIS_LIMITS } from '../review/pdf-text';
import { receiptFixtureKind } from './fixture-provider';
import { ReceiptAiConfig } from './ai-budget';

type Source = { original: { sha256: string; mimeType: string; byteSize: number } | null };

/** Controlled release: fixtures by default; personal sources require an explicit hash allowlist. */
@Injectable()
export class ReceiptReleasePolicy {
  constructor(private readonly config: ReceiptAiConfig = new ReceiptAiConfig()) {}
  allows(source: Source | null): boolean {
    const original = source?.original;
    return !!original && original.mimeType === 'application/pdf' && original.byteSize > 0 && original.byteSize <= ANALYSIS_LIMITS.maxFileBytes && (receiptFixtureKind(original.sha256) !== null || this.config.sourceAuthorized(original.sha256));
  }
  require(source: Source | null): void {
    if (!this.allows(source)) throw new ServiceUnavailableException({ code: 'receipt_assistance_in_development', message: 'La ricevuta assistita non è abilitata per questo documento. Il documento non viene analizzato o modificato.' });
  }
  providers(source?: Source | null, anthropic = false) {
    return [
      ...(!source || receiptFixtureKind(source.original?.sha256 ?? '') ? [{ id: 'receipt_fixture_v1', label: 'Simulazione locale · PDF di collaudo', requiresConsent: false, consentText: 'Usa soltanto i PDF sintetici di collaudo. Nessun documento viene inviato a servizi esterni.', costNote: 'Simulazione locale senza costi API.' }] : []),
      ...(anthropic ? [{ id: 'anthropic', label: 'Anthropic', requiresConsent: true, consentText: 'Verrà inviato ad Anthropic il testo di questo PDF, comprese eventuali informazioni personali presenti nel testo. L’originale resta in Dimora. Le proposte saranno da rivedere.', costNote: 'Massimo 0,25 USD riservati per questa analisi, entro il limite autorizzato. Il costo effettivo sarà mostrato nello stato.' }] : []),
    ];
  }
}
