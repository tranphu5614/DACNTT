import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TextCompleteService {
  private readonly logger = new Logger(TextCompleteService.name);
  private model: any = null;
  private readyPromise: Promise<void> | null = null;

  constructor() {
    this.readyPromise = this.init();
  }

  private async init() {
    try {
      this.logger.log('Loading text-generation model (may take a while)...');
      // Dynamic import để tránh lỗi ESM
      const { pipeline } = await import('@xenova/transformers');
      this.model = await pipeline('text-generation', 'Xenova/bert-base-multilingual-uncased');
      this.logger.log('Text generation model loaded');
    } catch (e) {
      this.logger.error('Failed to load text-generation model', e);
    }
  }

  private async ensureReady() {
    if (this.readyPromise) await this.readyPromise;
  }

  async complete(text: string): Promise<string> {
    await this.ensureReady();
    if (!this.model) return '';

    const prompt = `Người dùng mô tả sự cố kỹ thuật: "${text}"
Hãy mở rộng và làm rõ mô tả một cách ngắn gọn, chính xác, chỉ mô tả vấn đề & các bước đã thử (nếu có). Không thêm nguyên nhân suy đoán.

Mô tả đầy đủ:`;

    try {
      const res: any = await this.model(prompt, { max_new_tokens: 60, do_sample: false });
      let generated = '';
      if (Array.isArray(res)) {
        generated = res[0]?.generated_text || res[0]?.text || '';
      } else {
        generated = res.generated_text || '';
      }
      if (generated.startsWith(prompt)) {
        return generated.slice(prompt.length).trim();
      }
      return generated.trim();
    } catch (e) {
      this.logger.warn('Text completion failed', e);
      return '';
    }
  }
}