import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { UserDocument } from '../users/user.schema';
import { UsersRepository } from '../users/users.repository';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import type {
  AuthMeResponse,
  AuthSessionResponse,
  AuthenticatedUserDto,
  AccessTokenPayload,
} from './auth.types';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto): Promise<AuthSessionResponse> {
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
    });

    return this.buildSessionResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthSessionResponse> {
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

    return this.buildSessionResponse(updatedUser);
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

  private async buildSessionResponse(user: UserDocument): Promise<AuthSessionResponse> {
    return {
      user: this.buildAuthUser(user),
      accessToken: await this.signAccessToken(user),
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
}