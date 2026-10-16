import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, UnprocessableEntityException, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';
@Catch()
export class ApiErrorFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const path = host.switchToHttp().getRequest<Request>().path;
    const documentRoute = path.includes('/documents') || /\/homes\/[^/]+\/(document-search-capabilities$|document-intake(?:\/|$))/.test(path);
    const reviewRoute = /\/homes\/[^/]+\/(analysis-capabilities|analysis-jobs|assets|review)(\/|$)/.test(host.switchToHttp().getRequest<Request>().path);
    const activityRoute = /\/homes\/[^/]+\/(activity-capabilities|activity-summary|activities)(\/|$)/.test(host.switchToHttp().getRequest<Request>().path);
    const expenseRoute = /\/homes\/[^/]+\/(expense-capabilities|expense-summary|expenses)(\/|$)/.test(path);
    const objectRoute = /\/homes\/[^/]+\/(object-capabilities|rooms|objects)(\/|$)/.test(path);
    let status = error instanceof HttpException ? error.getStatus() : 503;
    if (status === 400) status = 422;
    const detail = error instanceof HttpException ? error.getResponse() : null;
    const info = typeof detail === 'object' && detail ? detail as { message?: string | string[]; code?: string; fieldErrors?: Record<string, string> } : null;
    const message = status === 503 ? 'Servizio temporaneamente non disponibile.' : documentRoute && status === 413 && !info?.code ? 'Il file supera 20 MiB.' : documentRoute && status === 422 && !info?.code ? 'Controlla il file e i dati inseriti.' : typeof info?.message === 'string' ? info.message : 'Controlla i dati inseriti.';
    const codes: Record<number, string> = { 401: 'UNAUTHENTICATED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 409: 'CONFLICT', 422: 'VALIDATION_ERROR', 429: 'RATE_LIMITED', 503: 'SERVICE_UNAVAILABLE' };
    const documentCodes: Record<number, string> = { 413: 'file_too_large', 415: 'unsupported_file_type', 422: 'validation_error' };
    res.status(status).json({ error: { code: info?.code || ((reviewRoute || activityRoute || expenseRoute || objectRoute) && status === 422 ? 'validation_error' : undefined) || (documentRoute ? documentCodes[status] : undefined) || codes[status] || 'REQUEST_ERROR', message, ...(info?.fieldErrors ? { fieldErrors: info.fieldErrors } : {}), requestId: randomUUID() } });
  }
}
export async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['warn', 'error'] });
  app.setGlobalPrefix('api/v5');
  app.use(cookieParser());
  app.use((_req: Request, res: Response, next: () => void) => { res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); next(); });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true, exceptionFactory: errors => new UnprocessableEntityException({ message: 'Controlla i dati inseriti.', fieldErrors: Object.fromEntries(errors.map(e => [e.property, Object.values(e.constraints || {})[0] || 'Valore non valido.'])) }) }));
  app.useGlobalFilters(new ApiErrorFilter());
  app.enableShutdownHooks();
  await app.listen(3001, '127.0.0.1');
  console.log('Dimora V5 API identity-v1: http://127.0.0.1:3001/api/v5');
  return app;
}
if (require.main === module) void bootstrap().catch(() => { console.error('Avvio V5 non riuscito: verifica database dedicato e configurazione locale.'); process.exitCode = 1; });
