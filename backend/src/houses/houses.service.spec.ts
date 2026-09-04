import { PrismaService } from '../prisma/prisma.service';
import { AccessControlService } from '../access-control/access-control.service';
import { HousesService } from './houses.service';

const assertHouseOwner = jest.fn().mockResolvedValue(undefined);
const accessControl = {
  assertHouseOwner,
} as unknown as AccessControlService;

describe('HousesService.remove', () => {
  it("verifica che l'utente sia OWNER prima di cancellare la casa", async () => {
    const houseDelete = jest.fn().mockResolvedValue(undefined);
    const prisma = { house: { delete: houseDelete } };
    const service = new HousesService(
      prisma as unknown as PrismaService,
      accessControl,
    );

    await service.remove('user-1', 'house-1');

    expect(assertHouseOwner).toHaveBeenCalledWith('user-1', 'house-1');
    expect(houseDelete).toHaveBeenCalledWith({ where: { id: 'house-1' } });
  });
});
