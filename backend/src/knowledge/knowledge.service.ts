import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

// Helper để ép buộc sử dụng native import()
const dynamicImport = new Function('specifier', 'return import(specifier)');

type KnowledgeItem = {
  id: string;
  title?: string;
  keywords?: string[];
  solution: string;
};

@Injectable()
export class KnowledgeService implements OnModuleDestroy {
  private readonly logger = new Logger(KnowledgeService.name);
  private knowledge: KnowledgeItem[] = [];
  private kbEmbeddings: Float32Array[] = [];
  private model: any = null;
  private readyPromise: Promise<void> | null = null;

  constructor() {
    this.loadKnowledge();
    this.readyPromise = this.initModelAndEmbeddings();
  }

  private loadKnowledge() {
    try {
      // Đường dẫn đến file knowledge.json
      const p = path.join(__dirname, '..', '..', 'data', 'knowledge.json');
      if (!fs.existsSync(p)) {
        this.logger.warn(`Knowledge file not found at ${p}`);
        this.knowledge = [];
        return;
      }
      const raw = fs.readFileSync(p, 'utf8');
      this.knowledge = JSON.parse(raw) as KnowledgeItem[];
      this.logger.log(`Loaded ${this.knowledge.length} knowledge items`);
    } catch (err) {
      this.logger.error('Failed to load knowledge.json', err);
      this.knowledge = [];
    }
  }

  private async initModelAndEmbeddings() {
    try {
      this.logger.log('Loading embedding model (this may take a while the first time)...');
      const { pipeline } = await dynamicImport('@xenova/transformers');

      // Sử dụng model feature-extraction.
      // Thêm { quantized: false } để tránh lỗi nếu không tìm thấy file model lượng tử hóa.
      this.model = await pipeline(
        'feature-extraction',
        'Xenova/paraphrase-multilingual-MiniLM-L12-v2',
        { quantized: false }
      );

      // Tạo embedding cho tất cả các mục kiến thức hiện có
      this.kbEmbeddings = [];
      for (const item of this.knowledge) {
        // Kết hợp title và solution để tạo ngữ cảnh đầy đủ hơn cho embedding
        const text = `${item.title || ''} ${item.solution}`;
        const emb = await this.embed(text);
        this.kbEmbeddings.push(emb);
      }
      this.logger.log('Knowledge embeddings ready');
    } catch (err) {
      this.logger.error('Failed to initialize embedding model', err);
    }
  }

  async ready() {
    if (this.readyPromise) await this.readyPromise;
  }

  private async embed(text: string): Promise<Float32Array> {
    if (!this.model) {
      await this.ready();
      if (!this.model) throw new Error('Embedding model not ready');
    }
    // Chạy model để lấy embedding, sử dụng pooling 'mean' và chuẩn hóa
    const out: any = await this.model(text, { pooling: 'mean', normalize: true });
    const arr = out.data;
    if (arr instanceof Float32Array) return arr;
    if (Array.isArray(arr)) {
      // Nếu kết quả là mảng lồng nhau, lấy phần tử đầu tiên
      const flat = Array.isArray(arr[0]) ? arr[0] : arr;
      return Float32Array.from(flat);
    }
    // Trường hợp khác, cố gắng chuyển đổi sang Float32Array
    return Float32Array.from(Object.values(arr));
  }

  // Hàm tính độ tương đồng cosine giữa 2 vector
  private cosine(a: Float32Array, b: Float32Array) {
    if (a.length !== b.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    // Vì đã normalize:true khi embed nên normA và normB xấp xỉ 1,
    // nhưng tính đầy đủ để chắc chắn.
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
  }

  async autocomplete(query: string, topK = 5) {
    if (!query || query.trim().length === 0) return [];
    try {
      await this.ready();
      if (!this.model) return [];

      // Tạo embedding cho câu truy vấn của người dùng
      const qEmb = await this.embed(query);

      // Tính điểm tương đồng với từng mục kiến thức
      const scored = this.kbEmbeddings.map((emb, idx) => {
        const score = this.cosine(qEmb, emb);
        return { item: this.knowledge[idx], score };
      });

      // Sắp xếp giảm dần theo điểm số
      scored.sort((a, b) => b.score - a.score);

      // Lấy top K kết quả tốt nhất
      return scored.slice(0, topK).map(s => ({
        id: s.item.id,
        title: s.item.title || (s.item.keywords ? s.item.keywords[0] : ''),
        suggestion: s.item.solution,
        score: s.score,
      }));
    } catch (e) {
      this.logger.warn('Autocomplete failed', e);
      return [];
    }
  }

  onModuleDestroy() {
    // Dọn dẹp nếu cần
    this.model = null;
  }
}