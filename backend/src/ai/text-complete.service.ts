// backend/src/ai/text-complete.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { pipeline } from '@xenova/transformers';

@Injectable()
export class TextCompleteService {
  private readonly logger = new Logger(TextCompleteService.name);
  private model: any = null;
  private readyPromise: Promise<void> | null = null;

  constructor() {
    this.readyPromise = this.init();
  }

  private async init() {
    this.logger.log('Loading text-generation model (may take a while)...');
    // Using a lightweight multilingual generator; replace if needed.
    this.model = await pipeline('text-generation', 'Xenova/bert-base-multilingual-uncased');
    this.logger.log('Text generation model loaded');
  }

  private async ensureReady() {
    if (this.readyPromise) await this.readyPromise;
  }

  async complete(text: string): Promise<string> {
    await this.ensureReady();

    const prompt = `Người dùng mô tả sự cố kỹ thuật: "${text}"
Hãy mở rộng và làm rõ mô tả một cách ngắn gọn, chính xác, chỉ mô tả vấn đề & các bước đã thử (nếu có). Không thêm nguyên nhân suy đoán.

Mô tả đầy đủ:`;

    const res: any = await this.model(prompt, { max_new_tokens: 60, do_sample: false });
    // res may be array; normalize:
    let generated = '';
    if (Array.isArray(res)) {
      generated = res[0]?.generated_text || res[0]?.text || '';
    } else {
      generated = res.generated_text || '';
    }
    // remove prompt
    if (generated.startsWith(prompt)) {
      return generated.slice(prompt.length).trim();
    }
    // fallback
    return generated.trim();
  }
}
