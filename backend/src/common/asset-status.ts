import { AssetStatus } from '@prisma/client';

// Regole da homeos_architettura_tecnica.md §6: lo status non è mai impostato
// dall'utente, si ricalcola da garanzia e presenza di documenti collegati.
export function computeAssetStatus(params: {
  warrantyUntil: Date | null;
  documentsCount: number;
}): AssetStatus {
  const { warrantyUntil, documentsCount } = params;

  if (warrantyUntil && warrantyUntil.getTime() < Date.now()) {
    return AssetStatus.DUE;
  }
  if (documentsCount === 0) {
    return AssetStatus.ATTENTION;
  }
  return AssetStatus.OK;
}
