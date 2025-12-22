import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PriorityClassifierService {
  private readonly logger = new Logger(PriorityClassifierService.name);
  private readonly API_KEY: string;
  private readonly baseUrl: string;
  // Cấu hình cứng model Flash: Nhanh, Rẻ, Hỗ trợ Free Tier tốt nhất
  private readonly MODEL_NAME = 'gemma-3-1b-it'; 

  constructor(private configService: ConfigService) {
    this.API_KEY = this.configService.get<string>('GEMINI_API_KEY') || '';
    
    // Gán thẳng URL của model Flash, không cần dò tìm
    this.baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.MODEL_NAME}:generateContent`;
    
    if (!this.API_KEY) {
        this.logger.error('❌ GEMINI_API_KEY is missing in environment variables!');
    } else {
        this.logger.log(`✅ PriorityService: Sẵn sàng sử dụng model "${this.MODEL_NAME}"`);
    }
  }

  // Đã xóa hàm onModuleInit và detectModel vì không cần thiết nữa

  async suggestPriority(text: string): Promise<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | null> {
    // 1. Validate đầu vào
    if (!text || text.trim().length < 3) return null;
    
    if (!this.API_KEY) {
      this.logger.error('Missing GEMINI_API_KEY');
      return null;
    }

    // 2. Tạo Prompt (Giữ nguyên)
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
      // 3. Gọi API
      const response = await fetch(`${this.baseUrl}?key=${this.API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) {
         // Log lỗi chi tiết nếu có
         const errorText = await response.text();
         this.logger.error(`Gemini Error [${response.status}]: ${errorText}`);
         return null;
      }

      const data = await response.json();
      const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()?.toUpperCase();
      
      // 4. Xử lý kết quả trả về
      const cleanAnswer = answer?.replace(/[^A-Z]/g, ''); // Chỉ lấy chữ cái A-Z

      this.logger.log(`Gemini Analysis: "${text}" -> ${cleanAnswer}`);

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