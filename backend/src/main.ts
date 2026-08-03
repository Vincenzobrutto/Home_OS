import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // true = riflette l'Origin della richiesta invece di un valore fisso:
  // serve per raggiungere l'app da cellulare sulla stessa rete (l'IP LAN
  // del PC può cambiare, es. col DHCP, quindi un solo FRONTEND_ORIGIN fisso
  // non basterebbe). Va bene per uso dev in LAN locale, non per un deploy
  // esposto su internet.
  app.enableCors({ origin: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
