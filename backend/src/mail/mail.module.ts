import { Global, Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: async (config: ConfigService) => {
        const port = Number(config.get('MAIL_PORT')) || 465;
        // Ép secure là true nếu dùng cổng 465, Google SMTP yêu cầu SSL ngay từ đầu ở cổng này
        const isSecure = port === 465;

        return {
          transport: {
            host: config.get('MAIL_HOST') || 'smtp.gmail.com',
            port: port,
            secure: isSecure,
            auth: {
              user: config.get('MAIL_USER'),
              // Tự động xóa khoảng trắng để tránh lỗi copy-paste từ Google
              pass: config.get('MAIL_PASSWORD')?.replace(/\s/g, ''),
            },
            tls: {
              // Quan trọng nhất cho Cloud: Bỏ qua kiểm tra chứng chỉ nghiêm ngặt của Proxy
              rejectUnauthorized: false,
              // Buộc sử dụng TLS 1.2 trở lên để tránh lỗi handshake cũ
              minVersion: 'TLSv1.2'
            },
            // Tăng Timeout lên mức cực đại (30 giây) để bù đắp độ trễ của Render Free
            connectionTimeout: 30000,
            greetingTimeout: 30000,
            socketTimeout: 30000,
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