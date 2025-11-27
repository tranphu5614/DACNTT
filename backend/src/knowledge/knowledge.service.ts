import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KnowledgeService implements OnModuleInit {
  private readonly logger = new Logger(KnowledgeService.name);
  private readonly API_KEY: string;
  private baseUrl: string;
  private currentModelName: string = 'gemini-pro'; // Mặc định dùng bản Free cũ nhất nếu dò tìm lỗi

  constructor(private configService: ConfigService) {
    this.API_KEY = this.configService.get<string>('GEMINI_API_KEY') || '';
    // Fallback mặc định: gemini-pro (Thường luôn có trong Free tier)
    this.baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent`;
  }

  async onModuleInit() {
    if (!this.API_KEY) return;
    await this.findFreeModel();
  }

  private async findFreeModel() {
    try {
      this.logger.log('🔍 Auto-detecting best FREE model...');
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.API_KEY}`;
      const response = await fetch(listUrl);

      if (!response.ok) throw new Error('List models failed');

      const data = await response.json();
      const models = data.models || [];

      // LOGIC CHỌN MODEL FREE:
      // 1. Ưu tiên Gemini 1.5 Flash (Nhanh, Free, Thông minh)
      // 2. Nếu không có, tìm Gemini Pro (Bản cũ, Free)
      const bestModel = 
        models.find((m: any) => m.name.includes('gemini-1.5-flash')) || 
        models.find((m: any) => m.name.includes('gemini-pro')) ||
        models.find((m: any) => m.supportedGenerationMethods?.includes('generateContent'));

      if (bestModel) {
        this.currentModelName = bestModel.name;
        this.baseUrl = `https://generativelanguage.googleapis.com/v1beta/${this.currentModelName}:generateContent`;
        this.logger.log(`✅ KẾT NỐI THÀNH CÔNG: Sử dụng model "${this.currentModelName}"`);
      } else {
        this.logger.warn('⚠️ Không tìm thấy model Free nào cụ thể, sử dụng mặc định gemini-pro.');
      }

    } catch (e) {
      this.logger.warn('⚠️ Lỗi dò tìm model, sẽ sử dụng fallback gemini-pro.');
    }
  }

  async autocomplete(query: string) {
    if (!query || query.trim().length < 3) return [];
    if (!this.API_KEY) return [];

    const prompt = `
      Context: IT Helpdesk Support.
      User Issue: "${query}"
      
      Task:
      1. Identify if the issue is COMPLEX (hardware, smoke, fire, server down) -> Return "COMPLEX_ISSUE".
      2. If SIMPLE (cable, restart, password) -> Return a short solution (max 30 words) in the user's language.
      
      Output: Plain text only.
    `;

    try {
      const response = await fetch(`${this.baseUrl}?key=${this.API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) return [];

      const data = await response.json();
      const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!answer || answer.includes('COMPLEX_ISSUE')) return [];

      return [{
        id: 'ai-auto-fix',
        title: '💡 Gợi ý nhanh (AI)',
        suggestion: answer,
        score: 1
      }];

    } catch (e) {
      this.logger.error('AI Service Error', e);
      return [];
    }
  }
}