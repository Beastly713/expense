import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthEmailService } from './auth-email.service';
import { AuthService } from './auth.service';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const accessSecret = configService.get<string>('jwt.accessSecret') ?? '';
        const accessExpiresIn =
          configService.get<string>('jwt.accessExpiresIn') ?? '15m';

        return {
          secret: accessSecret,
          signOptions: {
            expiresIn: accessExpiresIn as unknown as number,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthEmailService, AccessTokenGuard],
  exports: [AuthService, JwtModule, AccessTokenGuard],
})
export class AuthModule {}