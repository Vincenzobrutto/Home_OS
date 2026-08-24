import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService, type AuthResult } from './auth.service';
import { AccountStatusDto } from './dto/account-status.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { Public } from './public.decorator';
import {
  sanitizeUser,
  type AuthenticatedRequest,
} from './authenticated-request';

const SESSION_COOKIE = 'sid';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setSessionCookie(res: Response, result: AuthResult) {
    res.cookie(SESSION_COOKIE, result.token, {
      httpOnly: true,
      sameSite: 'lax',
      // In produzione dietro HTTPS questo va a true — oggi l'app gira in
      // LAN su HTTP semplice (vedi decisions.md #12), un cookie "secure"
      // non verrebbe mai impostato dal browser.
      secure: process.env.NODE_ENV === 'production',
      expires: result.expiresAt,
      path: '/',
    });
  }

  @Public()
  @Post('account-status')
  accountStatus(@Body() dto: AccountStatusDto) {
    return this.authService.accountStatus(dto);
  }

  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);
    this.setSessionCookie(res, result);
    return sanitizeUser(result.user);
  }

  @Public()
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    this.setSessionCookie(res, result);
    return sanitizeUser(result.user);
  }

  @Public()
  @Post('set-password')
  async setPassword(
    @Body() dto: SetPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.setPassword(dto);
    this.setSessionCookie(res, result);
    return sanitizeUser(result.user);
  }

  @Post('logout')
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    if (token) await this.authService.logout(token);
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    return { success: true };
  }

  @Get('me')
  me(@Req() req: AuthenticatedRequest) {
    return sanitizeUser(req.user);
  }
}
