import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { PriorityClassifierService } from './priority-classifier.service';

@Module({
  controllers: [AiController],
  providers: [KnowledgeService, PriorityClassifierService],
  exports: [KnowledgeService, PriorityClassifierService],
})
export class AiModule {}