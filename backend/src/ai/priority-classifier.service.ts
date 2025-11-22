import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PriorityClassifierService implements OnModuleInit {
  private readonly logger = new Logger(PriorityClassifierService.name);
  private readonly API_KEY: string;
  private baseUrl: string;
  private currentModelName: string = 'gemini-pro'; // Model fallback mặc định

  constructor(private configService: ConfigService) {
    this.API_KEY = this.configService.get<string>('GEMINI_API_KEY') || '';
    
    // URL mặc định an toàn nhất (gemini-pro thường luôn có)
    // Chúng ta sẽ cập nhật URL này bằng hàm detectModel() khi server chạy
    this.baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent`;
    
    if (!this.API_KEY) {
        this.logger.error('GEMINI_API_KEY is missing in environment variables!');
    }
  }

  // 1. Chạy ngay khi module khởi tạo để tìm model đúng
  async onModuleInit() {
    if (this.API_KEY) {
      await this.detectModel();
    }
  }

  // 2. Hàm dò tìm model khả dụng trên tài khoản của bạn
  private async detectModel() {
    try {
      this.logger.log('🔍 PriorityService: Đang dò tìm model AI phù hợp...');
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.API_KEY}`);
      
      if (response.ok) {
        const data = await response.json();
        const models = data.models || [];
        
        // Ưu tiên tìm Flash (nhanh/rẻ) -> Sau đó tìm Pro -> Sau đó tìm bất kỳ cái nào
        const best = 
          models.find((m: any) => m.name.includes('gemini-1.5-flash')) ||
          models.find((m: any) => m.name.includes('gemini-pro')) ||
          models.find((m: any) => m.supportedGenerationMethods?.includes('generateContent'));

        if (best) {
            this.currentModelName = best.name;
            this.baseUrl = `https://generativelanguage.googleapis.com/v1beta/${best.name}:generateContent`;
            this.logger.log(`✅ PriorityService: Đã kết nối thành công với model "${best.name}"`);
        } else {
            this.logger.warn('⚠️ Không tìm thấy model ưu tiên, sử dụng fallback mặc định.');
        }
      }
    } catch (e) {
      this.logger.warn('⚠️ Lỗi khi dò tìm model, sẽ sử dụng cấu hình mặc định.');
    }
  }

  async suggestPriority(text: string): Promise<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | null> {
    if (!text || text.trim().length < 3) return null;
    
    if (!this.API_KEY) {
      this.logger.error('Missing GEMINI_API_KEY in .env');
      return null;
    }

    const prompt = `
      Role: AI Priority Classifier for IT/HR system.
      Input Text: "${text}"
      
      Task: Classify the priority based on these rules:
      - URGENT: System crash, data loss, fire, company-wide stoppage, server down.
      - HIGH: Serious error affecting many users, work blockage, broken hardware.
      - MEDIUM: Standard request, personal error, software install, access request.
      - LOW: Question, inquiry, non-urgent task, typo fix.
      
      Output Requirement: Return ONLY one word from the list [URGENT, HIGH, MEDIUM, LOW]. 
      Do not include markdown, punctuation, or explanation.
    `;

    try {
      // Gọi API với URL đã được detect chính xác
      const response = await fetch(`${this.baseUrl}?key=${this.API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) {
         const errorText = await response.text();
         this.logger.error(`Gemini Priority API Error [${this.currentModelName}]: ${response.status} - ${errorText}`);
         return null;
      }

      const data = await response.json();
      const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()?.toUpperCase();
      
      // Clean up answer
      const cleanAnswer = answer?.replace(/[^A-Z]/g, '');

      this.logger.log(`Gemini Priority Analysis: "${text}" -> ${cleanAnswer}`);

      if (cleanAnswer && ['URGENT', 'HIGH', 'MEDIUM', 'LOW'].includes(cleanAnswer)) {
        return cleanAnswer as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      }
      
      return null;

    } catch (e) {
      this.logger.error('Call Gemini API failed', e);
      return null;
    }
  }
}