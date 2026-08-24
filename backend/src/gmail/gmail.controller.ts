import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { GmailService } from './gmail.service';

@Controller()
export class GmailController {
  constructor(private readonly gmailService: GmailService) {}

  // req.user.id, non più un userId letto dalla query: prima chiunque
  // conoscesse un id poteva agganciare il proprio account Google a un altro
  // utente HomeOS.
  @Get('auth/gmail/connect')
  connect(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const frontendOrigin =
      process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
    try {
      res.redirect(this.gmailService.getAuthUrl(req.user.id));
    } catch {
      // Tipicamente GOOGLE_CLIENT_ID/SECRET non ancora configurati in .env:
      // torniamo al frontend invece di mostrare il JSON grezzo dell'errore.
      res.redirect(`${frontendOrigin}/?gmail=error`);
    }
  }

  @Get('auth/gmail/callback')
  async callback(
    @Req() req: AuthenticatedRequest,
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const frontendOrigin =
      process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
    try {
      await this.gmailService.handleCallback(code, state, req.user.id);
      res.redirect(`${frontendOrigin}/?gmail=connected`);
    } catch {
      res.redirect(`${frontendOrigin}/?gmail=error`);
    }
  }

  @Get('users/me/gmail-status')
  getStatus(@Req() req: AuthenticatedRequest) {
    return this.gmailService.getStatus(req.user.id);
  }

  @Post('users/me/gmail-disconnect')
  disconnect(@Req() req: AuthenticatedRequest) {
    return this.gmailService.disconnect(req.user.id);
  }

  @Post('houses/:houseId/gmail-scan')
  scan(
    @Req() req: AuthenticatedRequest,
    @Param('houseId', ParseUUIDPipe) houseId: string,
    @Body('months') months?: number,
  ) {
    return this.gmailService.scan(houseId, req.user.id, months);
  }
}
