import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import type { UserDocument } from '../users/user.schema';
import { UsersRepository } from '../users/users.repository';
import type {
  AccessTokenPayload,
  AuthMeResponse,
  AuthSessionArtifacts,
  AuthenticatedUserDto,
  LogoutResponse,
  RefreshAccessTokenResponse,
  RefreshTokenPayload,
} from './auth.types';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<AuthSessionArtifacts> {
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
}