import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { GmailService } from './gmail.service';

@Controller()
export class GmailController {
  constructor(private readonly gmailService: GmailService) {}

  @Get('auth/gmail/connect')
  connect(
    @Query('userId', ParseUUIDPipe) userId: string,
    @Res() res: Response,
  ) {
    const frontendOrigin =
      process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
    try {
      res.redirect(this.gmailService.getAuthUrl(userId));
    } catch {
      // Tipicamente GOOGLE_CLIENT_ID/SECRET non ancora configurati in .env:
      // torniamo al frontend invece di mostrare il JSON grezzo dell'errore.
      res.redirect(`${frontendOrigin}/?gmail=error`);
    }
  }

  @Get('auth/gmail/callback')
  async callback(
    @Query('code') code: string,
    @Query('state') userId: string,
    @Res() res: Response,
  ) {
    const frontendOrigin =
      process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
    try {
      await this.gmailService.handleCallback(code, userId);
      res.redirect(`${frontendOrigin}/?gmail=connected`);
    } catch {
      res.redirect(`${frontendOrigin}/?gmail=error`);
    }
  }

  @Get('users/:userId/gmail-status')
  getStatus(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.gmailService.getStatus(userId);
  }

  @Post('users/:userId/gmail-disconnect')
  disconnect(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.gmailService.disconnect(userId);
  }

  @Post('houses/:houseId/gmail-scan')
  scan(
    @Param('houseId', ParseUUIDPipe) houseId: string,
    @Body('userId', ParseUUIDPipe) userId: string,
    @Body('months') months?: number,
  ) {
    return this.gmailService.scan(houseId, userId, months);
  }
}
