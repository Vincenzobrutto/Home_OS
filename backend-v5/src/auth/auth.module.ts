import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { RecoveryConfig } from './recovery-config';
import { RecoveryService } from './recovery.service';
@Module({ controllers: [AuthController], providers: [AuthService, RecoveryConfig, RecoveryService], exports: [RecoveryConfig, RecoveryService] })
export class AuthModule {}
