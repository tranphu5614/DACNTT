import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { RequestsModule } from './requests/requests.module';
import { CatalogModule } from './catalog/catalog.module';
import { AiModule } from './ai/ai.module';
import { MailModule } from './mail/mail.module';
import { RateLimitMiddleware } from './middleware/rate-limit.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    
    // [FIX] Sửa lại dòng này
    ServeStaticModule.forRoot({
      // process.cwd() trả về thư mục gốc nơi chạy lệnh (trong Docker là /app)
      // Kết quả: /app/uploads -> Chính xác nơi chứa ảnh
      rootPath: join(process.cwd(), 'uploads'), 
      serveRoot: '/uploads', 
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    
    MailModule,

    UsersModule,
    AuthModule,
    RequestsModule,
    CatalogModule,
    AiModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RateLimitMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}