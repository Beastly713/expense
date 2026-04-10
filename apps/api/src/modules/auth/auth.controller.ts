import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import type { AuthenticatedRequestUser } from '../../common/types/authenticated-request-user';
import {
  buildRefreshTokenCookieOptions,
  clearRefreshTokenCookie,
  getRefreshTokenFromRequest,
  setRefreshTokenCookie,
} from './auth.cookies';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignupDto } from './dto/signup.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('signup')
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.authService.signup(dto);

    setRefreshTokenCookie(
      response,
      session.refreshToken,
      this.getRefreshCookieOptions(),
    );

    return {
      user: session.user,
      accessToken: session.accessToken,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.authService.login(dto);

    setRefreshTokenCookie(
      response,
      session.refreshToken,
      this.getRefreshCookieOptions(),
    );

    return {
      user: session.user,
      accessToken: session.accessToken,
    };
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  getMe(@CurrentUser() currentUser: AuthenticatedRequestUser) {
    return this.authService.getMe(currentUser.userId);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = getRefreshTokenFromRequest(request);

    if (!refreshToken) {
      clearRefreshTokenCookie(response, this.getRefreshCookieOptions());
      return this.authService.refreshAccessToken('');
    }

    const session = await this.authService.refreshAccessToken(refreshToken);

    setRefreshTokenCookie(
      response,
      session.refreshToken,
      this.getRefreshCookieOptions(),
    );

    return {
      accessToken: session.accessToken,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = getRefreshTokenFromRequest(request);

    clearRefreshTokenCookie(response, this.getRefreshCookieOptions());

    return this.authService.logout(refreshToken);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  private getRefreshCookieOptions() {
    const nodeEnv = this.configService.get<string>('app.nodeEnv') ?? 'development';
    const apiPrefix = this.configService.get<string>('app.apiPrefix') ?? 'api/v1';
    const refreshExpiresIn =
      this.configService.get<string>('jwt.refreshExpiresIn') ?? '7d';

    return buildRefreshTokenCookieOptions({
      nodeEnv,
      apiPrefix,
      refreshExpiresIn,
    });
  }
}