import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { CreateOrganisationDto } from './dto/create-organisation.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SwitchOrganisationDto } from './dto/switch-organisation.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
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
  acceptInvitation(@Body() dto: AcceptInvitationDto) {
    return this.authService.acceptInvitation(dto);
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
}
