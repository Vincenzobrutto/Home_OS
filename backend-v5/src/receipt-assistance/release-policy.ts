import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ANALYSIS_LIMITS } from '../review/pdf-text';
import { receiptFixtureKind } from './fixture-provider';

type Source = { original: { sha256: string; mimeType: string; byteSize: number } | null };

/** The first browser release is restricted to the exact synthetic originals. */
@Injectable()
export class ReceiptReleasePolicy {
  allows(source: Source | null): boolean {
    const original = source?.original;
    return !!original && original.mimeType === 'application/pdf' && original.byteSize > 0 && original.byteSize <= ANALYSIS_LIMITS.maxFileBytes && receiptFixtureKind(original.sha256) !== null;
  }
  require(source: Source | null): void {
    if (!this.allows(source)) throw new ServiceUnavailableException({ code: 'receipt_assistance_in_development', message: 'La ricevuta assistita è in collaudo soltanto sui PDF sintetici. Il tuo documento non viene analizzato o modificato.' });
  }
  providers() {
    return [{ id: 'receipt_fixture_v1', label: 'Simulazione locale · PDF di collaudo', requiresConsent: false, consentText: 'Usa soltanto i PDF sintetici di collaudo. Nessun documento viene inviato a servizi esterni.', costNote: 'Simulazione locale senza costi API.' }];
  }
}
