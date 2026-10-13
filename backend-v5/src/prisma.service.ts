import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/client';

export function assertDevelopmentDatabase(raw: string | undefined) {
  if (!raw) throw new Error('DATABASE_URL V5 mancante');
  const url = new URL(raw);
  if (!['postgresql:', 'postgres:'].includes(url.protocol) || !['127.0.0.1', 'localhost'].includes(url.hostname) || url.port !== '55432' || url.pathname !== '/dimora_v5_product_dev' || url.username !== 'dimora_v5_app') {
    throw new Error('Il backend iniziale V5 accetta soltanto il database locale dedicato.');
  }
}
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() { assertDevelopmentDatabase(process.env.DATABASE_URL); super(); }
  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
