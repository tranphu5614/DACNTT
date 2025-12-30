import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly apiKey: string;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(private configService: ConfigService) {
    // ✅ SỬA LỖI TS2322: Dùng toán tử || '' để đảm bảo luôn là string
    this.apiKey = this.configService.get<string>('MAIL_API_KEY') || '';
    this.fromEmail = this.configService.get<string>('MAIL_FROM_EMAIL') || '';
    this.fromName = this.configService.get<string>('MAIL_FROM_NAME') || 'System';

    if (!this.apiKey || !this.fromEmail) {
      this.logger.warn('⚠️ Thiếu cấu hình MAIL_API_KEY hoặc MAIL_FROM_EMAIL. Gửi mail có thể thất bại.');
    }
  }

  async sendMail(to: string, subject: string, content: string) {
    const url = 'https://api.brevo.com/v3/smtp/email';
    
    const body = {
      sender: { name: this.fromName, email: this.fromEmail },
      to: [{ email: to }],
      subject: subject,
      htmlContent: content,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': this.apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        this.logger.error(`❌ Brevo API Error: ${JSON.stringify(errorData)}`);
        return { success: false, error: errorData };
      }

      const data = await response.json();
      this.logger.log(`✅ Mail sent successfully! ID: ${data.messageId}`);
      return { success: true, data };

    } catch (error: any) { 
      // ✅ SỬA LỖI TS18046: Ép kiểu 'any' cho biến error
      const errorMessage = error?.message || 'Unknown error';
      this.logger.error('❌ Network Error calling Brevo:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }
}