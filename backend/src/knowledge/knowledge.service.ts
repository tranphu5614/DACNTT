// backend/src/knowledge/knowledge.service.ts
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { pipeline } from '@xenova/transformers';

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
      const p = path.join(__dirname, '..', '..', 'data', 'knowledge.json');
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
      this.model = await pipeline(
        'feature-extraction',
        'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2'
      );

      this.kbEmbeddings = [];
      for (const item of this.knowledge) {
        const text = `${item.title || ''} ${item.solution}`;
        const emb = await this.embed(text);
        this.kbEmbeddings.push(emb);
      }
      this.logger.log('Knowledge embeddings ready');
    } catch (err) {
      this.logger.error('Failed to initialize embedding model', err);
      throw err;
    }
  }

  async ready() {
    if (this.readyPromise) await this.readyPromise;
  }

  private async embed(text: string): Promise<Float32Array> {
    if (!this.model) {
      if (this.readyPromise) await this.readyPromise;
      if (!this.model) throw new Error('Embedding model not ready');
    }
    const out: any = await this.model(text, { pooling: 'mean', normalize: true });
    const arr = out.data;
    if (arr instanceof Float32Array) return arr;
    if (Array.isArray(arr)) {
      const flat = Array.isArray(arr[0]) ? arr[0] : arr;
      return Float32Array.from(flat);
    }
    return Float32Array.from(Object.values(arr));
  }

  private cosine(a: Float32Array, b: Float32Array) {
    const len = Math.min(a.length, b.length);
    let s = 0;
    for (let i = 0; i < len; i++) s += a[i] * b[i];
    return s;
  }

  async autocomplete(query: string, topK = 5) {
    if (!query || query.trim().length === 0) return [];
    await this.ready();

    const qEmb = await this.embed(query);

    const scored = this.kbEmbeddings.map((emb, idx) => {
      const score = this.cosine(qEmb, emb);
      return { item: this.knowledge[idx], score };
    });

    scored.sort((a, b) => b.score - a.score);

    const suggestions = scored.slice(0, topK).map(s => ({
      id: s.item.id,
      title: s.item.title || (s.item.keywords ? s.item.keywords[0] : ''),
      suggestion: s.item.solution,
      score: s.score,
    }));

    return suggestions;
  }

  async getBestSuggestion(problemText: string) {
    await this.ready();
    const qEmb = await this.embed(problemText);

    let bestIndex = -1;
    let bestScore = -Infinity;
    for (let i = 0; i < this.kbEmbeddings.length; i++) {
      const score = this.cosine(qEmb, this.kbEmbeddings[i]);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    if (bestIndex === -1) return null;
    if (bestScore < 0.25) return null;

    return {
      matchedKnowledgeId: this.knowledge[bestIndex].id,
      suggestionText: this.knowledge[bestIndex].solution,
      confidence: bestScore,
    };
  }

  async reloadKnowledge() {
    this.loadKnowledge();
    await this.initModelAndEmbeddings();
  }

  onModuleDestroy() {}
}
