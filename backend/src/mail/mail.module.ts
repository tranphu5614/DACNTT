import { Global, Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: async (config: ConfigService) => {
        // Tự động xác định secure dựa trên PORT hoặc biến môi trường
        const port = config.get<number>('MAIL_PORT') || 587;
        const isSecure = port === 465; 

        return {
          transport: {
            host: config.get('MAIL_HOST'),
            port: port,
            secure: isSecure, 
            auth: {
              user: config.get('MAIL_USER'),
              pass: config.get('MAIL_PASSWORD'),
            },
            tls: {
              // Giúp chạy mượt trên Render và không gây lỗi ở Local
              rejectUnauthorized: false,
            },
            // Tăng thời gian chờ để ổn định trên môi trường Cloud
            connectionTimeout: 15000,
            greetingTimeout: 15000,
          },
          defaults: {
            from: config.get('MAIL_FROM'),
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  exports: [MailerModule],
})
export class MailModule {}