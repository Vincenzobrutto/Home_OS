import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { IS_PUBLIC_KEY } from './public.decorator';

// Guard globale (vedi AuthModule): nega per default, a meno che la rotta
// non sia marcata @Public(). Il token di sessione è il cookie stesso, non
// un JWT — quindi qui basta un lookup diretto sulla tabella Session invece
// di verificare una firma.
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = request.cookies?.sid as string | undefined;
    if (!token) {
      throw new UnauthorizedException('Accesso richiesto.');
    }

    const session = await this.prisma.session.findUnique({
      where: { id: token },
      include: { user: true },
    });
    if (!session || session.expiresAt < new Date()) {
      if (session) {
        // Sessione scaduta trovata: la ripuliamo invece di lasciarla come
        // riga morta, non è una condizione d'errore da propagare.
        await this.prisma.session.delete({ where: { id: token } });
      }
      throw new UnauthorizedException('Sessione scaduta o non valida.');
    }

    (request as Request & { user: typeof session.user }).user = session.user;
    return true;
  }
}
