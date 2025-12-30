import { Global, Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: async (config: ConfigService) => ({
        transport: {
          host: config.get('MAIL_HOST') || 'smtp.gmail.com',
          port: 465,
          secure: true, // Chạy cổng 465 bắt buộc secure: true
          auth: {
            user: config.get('MAIL_USER'),
            pass: config.get('MAIL_PASSWORD')?.replace(/\s/g, ''),
          },
          // THÊM PHẦN NÀY ĐỂ FIX TIMEOUT TRÊN CLOUD
          connectionTimeout: 30000,
          greetingTimeout: 30000,
          socketTimeout: 30000,
          dnsV6Order: false, // Ép ưu tiên IPv4 để tránh lỗi nghẽn IPv6 trên Render
          tls: {
            rejectUnauthorized: false, // Bỏ qua lỗi chứng chỉ Proxy
          },
        },
        defaults: {
          from: config.get('MAIL_FROM'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [MailerModule],
})
export class MailModule {}