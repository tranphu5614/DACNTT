import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { PriorityClassifierService } from './priority-classifier.service';

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly priorityClassifier: PriorityClassifierService,
  ) {}

  @Get('knowledge')
  async suggestKnowledge(@Query('q') query: string) {
    return this.knowledgeService.autocomplete(query);
  }

  // Đã xóa endpoint @Get('complete')
}