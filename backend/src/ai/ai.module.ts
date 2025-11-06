import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { TextCompleteService } from './text-complete.service';
import { KnowledgeService } from '../knowledge/knowledge.service';

@Module({
  controllers: [AiController],
  providers: [TextCompleteService, KnowledgeService],
  exports: [TextCompleteService, KnowledgeService],
})
export class AiModule {}