import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    // Globale: ogni rotta è protetta di default, @Public() la esclude
    // esplicitamente (vedi public.decorator.ts) — negare per default è più
    // sicuro che dover ricordarsi di proteggere ogni nuovo controller.
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AuthModule {}
