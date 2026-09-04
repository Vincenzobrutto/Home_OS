import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccessControlService } from './access-control.service';

function makeService(membership: { role: string } | null) {
  const prisma = {
    houseMembership: {
      findUnique: jest.fn().mockResolvedValue(membership),
    },
  };
  return {
    prisma,
    service: new AccessControlService(prisma as unknown as PrismaService),
  };
}

describe('AccessControlService.assertHouseOwner', () => {
  it('rifiuta un utente senza alcuna membership sulla casa', async () => {
    const { service } = makeService(null);

    await expect(
      service.assertHouseOwner('user-1', 'house-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rifiuta un membro con ruolo diverso da OWNER', async () => {
    const { service } = makeService({ role: 'MEMBER' });

    await expect(
      service.assertHouseOwner('user-1', 'house-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('accetta un membro con ruolo OWNER', async () => {
    const { service } = makeService({ role: 'OWNER' });

    await expect(
      service.assertHouseOwner('user-1', 'house-1'),
    ).resolves.toBeUndefined();
  });
});
