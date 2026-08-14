import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import type { GoogleProfile } from './strategies/google.strategy';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { CreateOrganisationDto } from './dto/create-organisation.dto';
import { DeclineInvitationDto } from './dto/decline-invitation.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SwitchOrganisationDto } from './dto/switch-organisation.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, req.ip);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Body() dto: RefreshDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.NO_CONTENT)
  resendVerification(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.sendVerificationEmail(user.userId);
  }

  @Get('organisations')
  myOrganisations(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.listMyOrganisations(user);
  }

  @Post('organisations')
  createOrganisation(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateOrganisationDto) {
    return this.authService.createOrganisation(user, dto);
  }

  @Post('switch-organisation')
  @HttpCode(HttpStatus.OK)
  switchOrganisation(@CurrentUser() user: AuthenticatedUser, @Body() dto: SwitchOrganisationDto) {
    return this.authService.switchOrganisation(user, dto.organisationId);
  }

  @Public()
  @Get('invitations/:token')
  invitationPreview(@Param('token') token: string) {
    return this.authService.getInvitationPreview(token);
  }

  @Public()
  @Post('accept-invitation')
  @HttpCode(HttpStatus.OK)
  acceptInvitation(@Body() dto: AcceptInvitationDto, @Req() req: Request) {
    return this.authService.acceptInvitation(dto, req.ip);
  }

  @Public()
  @Post('decline-invitation')
  @HttpCode(HttpStatus.NO_CONTENT)
  declineInvitation(@Body() dto: DeclineInvitationDto) {
    return this.authService.declineInvitation(dto.token);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @UseGuards(AuthGuard('google'))
  @Get('google')
  googleAuth() {
    // Redirige vers Google — géré entièrement par le guard Passport.
  }

  @Public()
  @UseGuards(AuthGuard('google'))
  @Get('google/callback')
  async googleCallback(@Req() req: Request & { user: GoogleProfile }, @Res() res: Response) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    try {
      const tokens = await this.authService.loginWithGoogle(req.user, req.ip);
      res.redirect(
        `${frontendUrl}/oauth-callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`,
      );
    } catch {
      res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
    }
  }
}
