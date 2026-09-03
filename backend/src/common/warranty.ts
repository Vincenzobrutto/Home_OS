import type { PrismaService } from '../prisma/prisma.service';
import { computeAssetStatus } from './asset-status';

// Regola di default: 24 mesi di garanzia dalla data di acquisto, se non se
// ne conosce una esplicita dal documento — modificabile manualmente per
// prodotti con garanzia più lunga o più corta (vedi Modifica asset).
const DEFAULT_WARRANTY_MONTHS = 24;

export function computeDefaultWarrantyUntil(purchasedAt: Date): Date {
  const result = new Date(purchasedAt);
  result.setUTCMonth(result.getUTCMonth() + DEFAULT_WARRANTY_MONTHS);
  return result;
}

// Unico writer di Asset.warrantyUntil/status da B50 in poi (vedi
// decisions.md #47): il valore riepilogativo è la garanzia applicabile più
// lontana tra tutte quelle registrate per l'Asset, mai un campo scritto
// indipendentemente da AssetsService/DocumentsService.
export async function recomputeAssetWarrantySummary(
  prisma: PrismaService,
  assetId: string,
): Promise<Date | null> {
  const [warranties, asset] = await Promise.all([
    prisma.warranty.findMany({
      where: { assetId },
      select: { expiresAt: true },
    }),
    prisma.asset.findUniqueOrThrow({
      where: { id: assetId },
      include: { _count: { select: { documents: true } } },
    }),
  ]);
  const warrantyUntil = warranties.length
    ? warranties.reduce(
        (max, w) => (w.expiresAt > max ? w.expiresAt : max),
        warranties[0].expiresAt,
      )
    : null;
  const status = computeAssetStatus({
    warrantyUntil,
    documentsCount: asset._count.documents,
  });
  await prisma.asset.update({
    where: { id: assetId },
    data: { warrantyUntil, status },
  });
  return warrantyUntil;
}
