import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { TextCompleteService } from './text-complete.service';

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly textCompleteService: TextCompleteService,
  ) {}

  @Get('knowledge')
  async suggestKnowledge(@Query('q') query: string) {
    return this.knowledgeService.autocomplete(query);
  }

  @Get('complete')
  async completeText(@Query('text') text: string) {
    const completed = await this.textCompleteService.complete(text);
    return { completed };
  }
}