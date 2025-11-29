import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; 
import { AiController } from './ai.controller';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { PriorityClassifierService } from './priority-classifier.service';
import { RequestsModule } from '../requests/requests.module'; 

@Module({
  imports: [
    ConfigModule, 
    forwardRef(() => RequestsModule), 
  ],
  controllers: [AiController],
  providers: [KnowledgeService, PriorityClassifierService],
  exports: [KnowledgeService, PriorityClassifierService],
})
export class AiModule {}