import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';

import { UsersRepository } from '../users/users.repository';
import type { UserDocument } from '../users/user.schema';
import { PASSWORD_RESET_TOKEN_TTL_MS } from './auth.constants';
import { AuthEmailService } from './auth-email.service';
import type {
  AccessTokenPayload,
  AuthMeResponse,
  AuthSessionArtifacts,
  AuthenticatedUserDto,
  LogoutResponse,
  RefreshTokenPayload,
} from './auth.types';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignupDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authEmailService: AuthEmailService,
  ) {}

  async signup(dto: SignupDto): Promise<AuthSessionArtifacts> {
    const existingUser = await this.usersRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'An account with this email already exists.',
      });
    }

    const now = new Date();
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.usersRepository.create({
      name: dto.name.trim(),
      email: dto.email,
      passwordHash,
      lastLoginAt: now,
      refreshTokenHash: null,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
    });

    return this.buildSessionArtifacts(user);
  }

  async login(dto: LoginDto): Promise<AuthSessionArtifacts> {
    const user = await this.usersRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      });
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      });
    }

    const updatedUser =
      (await this.usersRepository.updateById(user._id.toString(), {
        $set: {
          lastLoginAt: new Date(),
        },
      })) ?? user;

    return this.buildSessionArtifacts(updatedUser);
  }

  async getMe(userId: string): Promise<AuthMeResponse> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Access token is invalid or expired.',
      });
    }

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      defaultCurrency: user.defaultCurrency,
      notificationPreferences: user.notificationPreferences,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<AuthSessionArtifacts> {
    const user = await this.getUserForRefreshToken(refreshToken);
    return this.buildSessionArtifacts(user);
  }

  async logout(refreshToken: string | null): Promise<LogoutResponse> {
    if (!refreshToken) {
      return {
        message: 'Logged out successfully',
      };
    }

    const user = await this.tryGetUserForRefreshToken(refreshToken);
    if (user) {
      await this.usersRepository.updateById(user._id.toString(), {
        $set: {
          refreshTokenHash: null,
        },
      });
    }

    return {
      message: 'Logged out successfully',
    };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<LogoutResponse> {
    const user = await this.usersRepository.findByEmail(dto.email);

    if (!user) {
      return {
        message: 'Password reset email sent if account exists',
      };
    }

    const rawResetToken = randomBytes(32).toString('hex');
    const hashedResetToken = this.hashResetToken(rawResetToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);

    await this.usersRepository.updateById(user._id.toString(), {
      $set: {
        passwordResetTokenHash: hashedResetToken,
        passwordResetExpiresAt: expiresAt,
      },
    });

    await this.authEmailService.sendPasswordResetEmail({
      email: user.email,
      resetToken: rawResetToken,
    });

    return {
      message: 'Password reset email sent if account exists',
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<LogoutResponse> {
    const hashedResetToken = this.hashResetToken(dto.token);
    const user = await this.usersRepository.findByPasswordResetTokenHash(
      hashedResetToken,
    );

    if (!user) {
      throw new BadRequestException({
        code: 'INVALID_TOKEN',
        message: 'Reset token is invalid.',
      });
    }

    if (
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException({
        code: 'EXPIRED_TOKEN',
        message: 'Reset token has expired.',
      });
    }

    const nextPasswordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.usersRepository.updateById(user._id.toString(), {
      $set: {
        passwordHash: nextPasswordHash,
        refreshTokenHash: null,
      },
      $unset: {
        passwordResetTokenHash: 1,
        passwordResetExpiresAt: 1,
      },
    });

    return {
      message: 'Password reset successful',
    };
  }

  private async buildSessionArtifacts(
    user: UserDocument,
  ): Promise<AuthSessionArtifacts> {
    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(user),
      this.signRefreshToken(user),
    ]);

    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);

    await this.usersRepository.updateById(user._id.toString(), {
      $set: {
        refreshTokenHash,
      },
    });

    return {
      user: this.buildAuthUser(user),
      accessToken,
      refreshToken,
    };
  }

  private buildAuthUser(user: UserDocument): AuthenticatedUserDto {
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      defaultCurrency: user.defaultCurrency,
    };
  }

  private async signAccessToken(user: UserDocument): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: user._id.toString(),
      email: user.email,
    };

    return this.jwtService.signAsync(payload);
  }

  private async signRefreshToken(user: UserDocument): Promise<string> {
    const payload: RefreshTokenPayload = {
      sub: user._id.toString(),
      email: user.email,
      type: 'refresh',
    };

    const refreshSecret =
      this.configService.get<string>('jwt.refreshSecret') ?? '';
    const refreshExpiresIn =
      this.configService.get<string>('jwt.refreshExpiresIn') ?? '7d';

    return this.jwtService.signAsync(payload, {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn as unknown as number,
    });
  }

  private async getUserForRefreshToken(
    refreshToken: string,
  ): Promise<UserDocument> {
    const refreshSecret =
      this.configService.get<string>('jwt.refreshSecret') ?? '';

    let payload: RefreshTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        {
          secret: refreshSecret,
        },
      );
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Refresh token is invalid or expired.',
      });
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Refresh token is invalid or expired.',
      });
    }

    const user = await this.usersRepository.findById(payload.sub);
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Refresh token is invalid or expired.',
      });
    }

    const isRefreshTokenValid = await bcrypt.compare(
      refreshToken,
      user.refreshTokenHash,
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Refresh token is invalid or expired.',
      });
    }

    return user;
  }

  private async tryGetUserForRefreshToken(
    refreshToken: string,
  ): Promise<UserDocument | null> {
    try {
      return await this.getUserForRefreshToken(refreshToken);
    } catch {
      return null;
    }
  }

  private hashResetToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }
}