import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SessionsService } from './security';
import { AuthModule } from './auth/auth.module';
import { HomesModule } from './homes/homes.module';
import { DocumentsModule } from './documents/documents.module';
@Global() @Module({ providers: [PrismaService, SessionsService], exports: [PrismaService, SessionsService] })
export class InfrastructureModule {}
@Module({ imports: [InfrastructureModule, AuthModule, HomesModule, DocumentsModule] })
export class AppModule {}
