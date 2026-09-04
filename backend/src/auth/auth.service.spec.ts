import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService.deleteAccount', () => {
  it("cancella prima le case possedute, poi le membership residue, poi l'utente, in una singola transazione", async () => {
    const houseDeleteMany = jest.fn().mockReturnValue('op-houses');
    const membershipDeleteMany = jest.fn().mockReturnValue('op-memberships');
    const userDelete = jest.fn().mockReturnValue('op-user');
    const transaction = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      house: { deleteMany: houseDeleteMany },
      houseMembership: { deleteMany: membershipDeleteMany },
      user: { delete: userDelete },
      $transaction: transaction,
    };
    const service = new AuthService(prisma as unknown as PrismaService);

    await service.deleteAccount('user-1');

    expect(houseDeleteMany).toHaveBeenCalledWith({
      where: { ownerId: 'user-1' },
    });
    expect(membershipDeleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
    expect(userDelete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    // L'ordine conta: House.owner/HouseMembership.user sono Restrict verso
    // User, quindi le case vanno cancellate prima dell'utente (vedi
    // decisions.md #53) — verifichiamo la sequenza passata a $transaction,
    // non solo che ogni operazione sia stata chiamata.
    expect(transaction).toHaveBeenCalledWith([
      'op-houses',
      'op-memberships',
      'op-user',
    ]);
  });
});
