import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
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

  // --- Endpoint Chatbot ---
  @Post('chat')
  async chat(@Req() req: any, @Body() body: { history: any[], message: string }) {
    // Lấy userId từ request (do JwtAuthGuard gán vào)
    const userId = req.user?.userId || req.user?.sub || req.user?._id;
    
    const reply = await this.knowledgeService.chat(body.history || [], body.message, userId);
    return { reply };
  }
}