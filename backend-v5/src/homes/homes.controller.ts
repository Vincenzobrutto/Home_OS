import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CreateHomeDto } from '../dto';
import { SessionsService } from '../security';
import { HomesService } from './homes.service';
@Controller('homes')
export class HomesController {
  constructor(private readonly homes: HomesService, private readonly sessions: SessionsService) {}
  @Get() async list(@Req() req: Request) { return this.homes.list((await this.sessions.require(req)).accountId); }
  @Get(':homeId') async get(@Req() req: Request, @Param('homeId', new ParseUUIDPipe()) id: string) { return this.homes.get((await this.sessions.require(req)).accountId, id); }
  @Post() async create(@Req() req: Request, @Body() dto: CreateHomeDto, @Headers('idempotency-key') key?: string) { return this.homes.create((await this.sessions.require(req, true)).accountId, dto, key); }
}
