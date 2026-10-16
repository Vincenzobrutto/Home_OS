import { Body, Controller, Get, HttpCode, Post, Req, Res, UnprocessableEntityException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { LoginDto, RegisterDto } from '../dto';
import { AuthService } from './auth.service';
import { RecoveryService } from './recovery.service';
import { RecoveryRequestDto, CompleteRecoveryDto, CompleteVerificationDto } from './recovery.dto';
@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly recovery: RecoveryService) {}
  @Post('auth/password-recovery') @HttpCode(202) recover(@Body() dto: RecoveryRequestDto, @Req() req: Request) { return this.recovery.request('reset_password',dto.email,req); }
  @Post('auth/password-recovery/complete') @HttpCode(204) async reset(@Body() dto: CompleteRecoveryDto, @Req() req: Request, @Res({passthrough:true}) res: Response) { await this.recovery.complete('reset_password',dto,req,res); }
  @Post('auth/email-verification') @HttpCode(202) verify(@Req() req: Request, @Body() body: Record<string,unknown>) { if(Object.keys(body||{}).length) throw new UnprocessableEntityException('Richiesta non valida.'); return this.recovery.request('verify_email',null,req); }
  @Post('auth/email-verification/complete') @HttpCode(204) async verified(@Body() dto: CompleteVerificationDto, @Req() req: Request, @Res({passthrough:true}) res: Response) { await this.recovery.complete('verify_email',dto,req,res); }
  @Get('session') session(@Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.auth.session(req, res); }
  @Post('auth/register') register(@Body() dto: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.auth.register(dto, req, res); }
  @Post('auth/login') @HttpCode(200) login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.auth.login(dto, req, res); }
  @Post('auth/logout') @HttpCode(204) logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.auth.logout(req, res); }
}
