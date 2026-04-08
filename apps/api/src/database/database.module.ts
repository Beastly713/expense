import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const mongoUri = configService.get<string>('database.mongoUri');
        const nodeEnv = configService.get<string>('app.nodeEnv') ?? 'development';

        if (!mongoUri) {
          throw new Error('MONGODB_URI is required.');
        }

        return {
          uri: mongoUri,
          autoIndex: nodeEnv !== 'production',
        };
      },
    }),
  ],
})
export class DatabaseModule {}