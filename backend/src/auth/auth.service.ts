import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AccountStatusDto } from './dto/account-status.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SetPasswordDto } from './dto/set-password.dto';

const scrypt = promisify(scryptCallback);
// 30 giorni: coerente con un'app personale a cui si accede da pochi
// dispositivi fidati, non con una sessione di lavoro breve.
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface AuthResult {
  user: User;
  token: string;
  expiresAt: Date;
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  // Formato "salt:hash", entrambi hex — scrypt nativo di Node invece di
  // bcrypt/argon2 per non aggiungere una dipendenza nuova: è la funzione
  // raccomandata dalla documentazione ufficiale di Node per questo scopo.
  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derived = (await scrypt(password, salt, 64)) as Buffer;
    return `${salt}:${derived.toString('hex')}`;
  }

  private async verifyPassword(
    password: string,
    stored: string,
  ): Promise<boolean> {
    const [salt, hashHex] = stored.split(':');
    if (!salt || !hashHex) return false;
    const derived = (await scrypt(password, salt, 64)) as Buffer;
    const storedBuf = Buffer.from(hashHex, 'hex');
    // timingSafeEqual richiede stessa lunghezza: un mismatch di lunghezza
    // è già "non valida", non un errore da propagare.
    return (
      derived.length === storedBuf.length && timingSafeEqual(derived, storedBuf)
    );
  }

  private async createSession(
    userId: string,
  ): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await this.prisma.session.create({
      data: { id: token, userId, expiresAt },
    });
    return { token, expiresAt };
  }

  async accountStatus(dto: AccountStatusDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { passwordHash: true },
    });
    if (!user) return { exists: false, hasPassword: false };
    return { exists: true, hasPassword: !!user.passwordHash };
  }

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Esiste già un account con questa email.');
    }
    const passwordHash = await this.hashPassword(dto.password);
    const user = await this.prisma.user.create({
      data: { email: dto.email, name: dto.name, passwordHash },
    });
    const { token, expiresAt } = await this.createSession(user.id);
    return { user, token, expiresAt };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    // Stesso messaggio per email inesistente e password errata, per non
    // rivelare quali email sono registrate dall'endpoint di login — la
    // distinzione "esiste ma senza password" la fa apposta accountStatus(),
    // unico varco pensato per quell'informazione (vedi decisions.md).
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Email o password non validi.');
    }
    const valid = await this.verifyPassword(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Email o password non validi.');
    }
    const { token, expiresAt } = await this.createSession(user.id);
    return { user, token, expiresAt };
  }

  // Solo per account creati prima dell'introduzione dell'autenticazione
  // (passwordHash ancora null): permette di impostarla una prima volta,
  // senza verifica email — oggi l'accesso a quell'account non richiede già
  // nessuna credenziale, quindi è un miglioramento netto, non un passo
  // indietro. Non utilizzabile per cambiare una password già impostata.
  async setPassword(dto: SetPasswordDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new NotFoundException('Nessun account con questa email.');
    }
    if (user.passwordHash) {
      throw new ConflictException(
        'Questo account ha già una password: usa il login.',
      );
    }
    const passwordHash = await this.hashPassword(dto.password);
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
    const { token, expiresAt } = await this.createSession(updated.id);
    return { user: updated, token, expiresAt };
  }

  async logout(sessionId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { id: sessionId } });
  }

  // Ordine obbligato: House.owner/HouseMembership.user non hanno un
  // onDelete esplicito verso User (Restrict di default) — cancellare
  // l'utente prima fallirebbe con un vincolo di integrità finché possiede
  // ancora una casa. Le case possedute cascano su tutto il loro contenuto
  // (17 tabelle con houseId diretto, tutte già Cascade/SetNull nello
  // schema — vedi decisions.md #53), quindi non serve altra pulizia.
  async deleteAccount(userId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.house.deleteMany({ where: { ownerId: userId } }),
      // Difensivo: membership su case non possedute (condivisione B12,
      // oggi sempre vuoto perché ogni casa ha un solo membro OWNER).
      this.prisma.houseMembership.deleteMany({ where: { userId } }),
      this.prisma.user.delete({ where: { id: userId } }),
    ]);
  }
}
