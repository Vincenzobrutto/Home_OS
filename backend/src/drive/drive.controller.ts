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
import { DriveService } from './drive.service';

@Controller()
export class DriveController {
  constructor(private readonly driveService: DriveService) {}

  @Get('auth/drive/connect')
  connect(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const frontendOrigin =
      process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
    try {
      res.redirect(this.driveService.getAuthUrl(req.user.id));
    } catch {
      res.redirect(`${frontendOrigin}/?drive=error`);
    }
  }

  @Get('auth/drive/callback')
  async callback(
    @Req() req: AuthenticatedRequest,
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const frontendOrigin =
      process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
    try {
      await this.driveService.handleCallback(code, state, req.user.id);
      res.redirect(`${frontendOrigin}/?drive=connected`);
    } catch {
      res.redirect(`${frontendOrigin}/?drive=error`);
    }
  }

  @Get('users/me/drive-status')
  getStatus(@Req() req: AuthenticatedRequest) {
    return this.driveService.getStatus(req.user.id);
  }

  @Post('users/me/drive-disconnect')
  disconnect(@Req() req: AuthenticatedRequest) {
    return this.driveService.disconnect(req.user.id);
  }

  @Get('users/me/drive-folders')
  listFolders(@Req() req: AuthenticatedRequest) {
    return this.driveService.listFolders(req.user.id);
  }

  @Post('users/me/drive-folder')
  selectFolder(
    @Req() req: AuthenticatedRequest,
    @Body('folderId') folderId: string,
    @Body('folderName') folderName: string,
  ) {
    return this.driveService.selectFolder(req.user.id, folderId, folderName);
  }

  @Post('houses/:houseId/drive-scan')
  scan(
    @Req() req: AuthenticatedRequest,
    @Param('houseId', ParseUUIDPipe) houseId: string,
  ) {
    return this.driveService.scan(houseId, req.user.id);
  }
}
