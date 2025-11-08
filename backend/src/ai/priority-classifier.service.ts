import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

// Helper to force native import()
const dynamicImport = new Function('specifier', 'return import(specifier)');

@Injectable()
export class PriorityClassifierService implements OnModuleInit {
  private readonly logger = new Logger(PriorityClassifierService.name);
  private model: any = null;

  private readonly LABEL_MAP = {
    'urgent': 'URGENT',
    'high': 'HIGH',
    'medium': 'MEDIUM',
    'low': 'LOW',
  };

  async onModuleInit() {
    await this.init();
  }

  private async init() {
    try {
      this.logger.log('Loading zero-shot classification model...');
      const { pipeline } = await dynamicImport('@xenova/transformers');

      // [REVERTED MODEL] Use the standard reliable model.
      // It works best with English but is stable.
      this.model = await pipeline('zero-shot-classification', 'Xenova/bart-large-mnli');

      this.logger.log('Zero-shot model (bart-large-mnli) loaded');
    } catch (e) {
      this.logger.error('Failed to load zero-shot model', e);
    }
  }

  async suggestPriority(text: string): Promise<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | null> {
    if (!this.model) return null;
    if (!text || text.trim().length < 3) return null;

    const candidate_labels = Object.keys(this.LABEL_MAP);

    try {
      const output = await this.model(text, candidate_labels, { multi_label: false });

      const topLabel = output.labels[0];
      const topScore = output.scores[0];

      this.logger.log(`AI analyzed: "${text}" -> ${topLabel} (score: ${Math.round(topScore * 100)}%)`);

      // Keep threshold 0.3 or 0.4 depending on testing results
      if (topScore < 0.3) return null;

      return this.LABEL_MAP[topLabel as keyof typeof this.LABEL_MAP] as any;
    } catch (e) {
      this.logger.warn('AI priority classification failed', e);
      return null;
    }
  }
}