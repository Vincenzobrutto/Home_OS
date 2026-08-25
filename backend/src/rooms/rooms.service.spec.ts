import { PrismaService } from '../prisma/prisma.service';
import { AccessControlService } from '../access-control/access-control.service';
import { RoomsService } from './rooms.service';

const accessControl = {
  assertHouseAccess: jest.fn().mockResolvedValue(undefined),
} as unknown as AccessControlService;

describe('RoomsService.create — code univoco tra case diverse', () => {
  // Bug reale (decisions.md #37): il codice veniva generato contando le
  // stanze della sola casa in creazione, ma Room.code è unico su tutta la
  // tabella — una seconda casa ripartiva sempre da AMB-001, in conflitto con
  // quello già esistente nella prima. Qui simuliamo esattamente quel caso:
  // una nuova casa (0 stanze proprie) quando esiste già AMB-011 altrove.
  it('continua dal massimo codice esistente su tutta la tabella, non da un conteggio per casa', async () => {
    const roomCreate = jest
      .fn()
      .mockResolvedValue({ id: 'room-new', code: 'AMB-012' });
    const prisma = {
      house: { findUnique: jest.fn().mockResolvedValue({ id: 'house-2' }) },
      room: {
        // Nessuna stanza nella casa nuova, ma AMB-011 esiste già altrove —
        // findFirst con orderBy globale è l'unica query che deve contare.
        findFirst: jest.fn().mockResolvedValue({ code: 'AMB-011' }),
        create: roomCreate,
      },
    };
    const service = new RoomsService(
      prisma as unknown as PrismaService,
      accessControl,
    );

    await service.create('user-1', 'house-2', {
      type: 'CUCINA',
      name: 'Cucina',
    } as never);

    expect(prisma.room.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { code: 'desc' } }),
    );
    expect(roomCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: 'AMB-012',
          houseId: 'house-2',
        }) as object,
      }),
    );
  });

  it('parte da AMB-001 quando la tabella è vuota', async () => {
    const roomCreate = jest
      .fn()
      .mockResolvedValue({ id: 'room-1', code: 'AMB-001' });
    const prisma = {
      house: { findUnique: jest.fn().mockResolvedValue({ id: 'house-1' }) },
      room: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: roomCreate,
      },
    };
    const service = new RoomsService(
      prisma as unknown as PrismaService,
      accessControl,
    );

    await service.create('user-1', 'house-1', {
      type: 'CUCINA',
      name: 'Cucina',
    } as never);

    expect(roomCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ code: 'AMB-001' }) as object,
      }),
    );
  });
});
