import { Body, Controller, Param, ParseUUIDPipe, Post, Query, Req, Res, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { SessionsService } from '../security';
import { object } from '../review/domain';
import { PersonalExportService } from './personal-export.service';

@Controller('homes/:homeId/personal-export')
export class PersonalExportController {
  constructor(private readonly exports: PersonalExportService, private readonly sessions: SessionsService) {}
  @Post()
  async export(@Req() req: Request, @Param('homeId', new ParseUUIDPipe()) homeId: string, @Body() body: unknown, @Query() query: unknown, @Res() res: Response) {
    const session = await this.sessions.require(req, true);
    if (req.headers['x-account-context'] !== session.accountId) throw new UnauthorizedException({ code: 'account_context_changed', message: 'Ricarica la sessione prima di esportare.' });
    object(body, []); object(query, []);
    const bytes = await this.exports.export(session.accountId, homeId, () => this.sessions.require(req, true));
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="dimora-casa-${homeId}-dati.json"`);
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
    res.status(200).send(bytes);
  }
}
