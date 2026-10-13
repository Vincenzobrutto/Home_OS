import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { LoginDto, RegisterDto } from '../dto';
import { AuthService } from './auth.service';
@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Get('session') session(@Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.auth.session(req, res); }
  @Post('auth/register') register(@Body() dto: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.auth.register(dto, req, res); }
  @Post('auth/login') @HttpCode(200) login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.auth.login(dto, req, res); }
  @Post('auth/logout') @HttpCode(204) logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.auth.logout(req, res); }
}
