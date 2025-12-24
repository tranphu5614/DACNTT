// backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule'; // <--- IMPORT

import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { RequestsModule } from './requests/requests.module';
import { CatalogModule } from './catalog/catalog.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(), // <--- ĐĂNG KÝ MODULE LÊN LỊCH TRÌNH
    UsersModule,
    AuthModule,
    RequestsModule,
    CatalogModule,
    AiModule,
  ],
})
export class AppModule {}