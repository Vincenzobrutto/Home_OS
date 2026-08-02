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
import { DriveService } from './drive.service';

@Controller()
export class DriveController {
  constructor(private readonly driveService: DriveService) {}

  @Get('auth/drive/connect')
  connect(
    @Query('userId', ParseUUIDPipe) userId: string,
    @Res() res: Response,
  ) {
    const frontendOrigin =
      process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
    try {
      res.redirect(this.driveService.getAuthUrl(userId));
    } catch {
      res.redirect(`${frontendOrigin}/?drive=error`);
    }
  }

  @Get('auth/drive/callback')
  async callback(
    @Query('code') code: string,
    @Query('state') userId: string,
    @Res() res: Response,
  ) {
    const frontendOrigin =
      process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
    try {
      await this.driveService.handleCallback(code, userId);
      res.redirect(`${frontendOrigin}/?drive=connected`);
    } catch {
      res.redirect(`${frontendOrigin}/?drive=error`);
    }
  }

  @Get('users/:userId/drive-status')
  getStatus(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.driveService.getStatus(userId);
  }

  @Post('users/:userId/drive-disconnect')
  disconnect(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.driveService.disconnect(userId);
  }

  @Get('users/:userId/drive-folders')
  listFolders(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.driveService.listFolders(userId);
  }

  @Post('users/:userId/drive-folder')
  selectFolder(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body('folderId') folderId: string,
    @Body('folderName') folderName: string,
  ) {
    return this.driveService.selectFolder(userId, folderId, folderName);
  }

  @Post('houses/:houseId/drive-scan')
  scan(
    @Param('houseId', ParseUUIDPipe) houseId: string,
    @Body('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.driveService.scan(houseId, userId);
  }
}
