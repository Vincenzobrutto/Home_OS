import { AssetStatus } from '@prisma/client';
import { computeAssetStatus } from './asset-status';

describe('computeAssetStatus', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-02T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('marks an asset with an expired warranty as due', () => {
    expect(
      computeAssetStatus({
        warrantyUntil: new Date('2026-08-01T23:59:59Z'),
        documentsCount: 3,
      }),
    ).toBe(AssetStatus.DUE);
  });

  it('marks an asset without documents as attention', () => {
    expect(
      computeAssetStatus({
        warrantyUntil: new Date('2027-08-02T00:00:00Z'),
        documentsCount: 0,
      }),
    ).toBe(AssetStatus.ATTENTION);
  });

  it('marks a documented asset without an expired warranty as ok', () => {
    expect(computeAssetStatus({ warrantyUntil: null, documentsCount: 1 })).toBe(
      AssetStatus.OK,
    );
  });
});
