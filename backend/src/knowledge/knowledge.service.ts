import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RequestsService } from '../requests/requests.service';

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);
  private readonly API_KEY: string;
  private readonly baseUrl: string;
  
  // -----------------------------------------------------------
  // CHUYỂN QUA GEMMA: Dùng bản 27B-IT
  // -----------------------------------------------------------
  private readonly MODEL_NAME = 'gemma-3-1b-it';

  constructor(
    private configService: ConfigService,
    @Inject(forwardRef(() => RequestsService))
    private requestsService: RequestsService,
  ) {
    this.API_KEY = this.configService.get<string>('GEMINI_API_KEY') || '';
    
    // Gemma dùng chung endpoint với Gemini trên Google AI Studio
    this.baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.MODEL_NAME}:generateContent`;

    if (!this.API_KEY) {
        this.logger.error('❌ Missing GEMINI_API_KEY in .env');
    } else {
        this.logger.log(`✅ KnowledgeService: Active with Gemma Model "${this.MODEL_NAME}"`);
    }
  }

  // --- Hàm "gọt vỏ" JSON: Gemma hay trả về kèm Markdown ---
  private cleanJsonString(input: string): string {
    let cleaned = input.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
    return cleaned;
  }

  // --- 1. Autocomplete ---
  async autocomplete(query: string) {
    if (!query || query.trim().length < 3) return [];
    if (!this.API_KEY) return [];
    
    try {
        const prompt = `
        Role: IT Specialist.
        Task: Analyze user input: "${query}".
        Output: If complex, return "COMPLEX_ISSUE". If simple, return a short solution string (max 10 words).
        Do not explain. Just the string.`;
        
        const response = await fetch(`${this.baseUrl}?key=${this.API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if(!response.ok) return [];
        
        const data = await response.json();
        let ans = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        
        ans = ans?.replace(/['"]/g, '');

        if (!ans || ans.includes('COMPLEX_ISSUE')) return [];
        
        return [{ id: 'ai-auto', title: '💡 Gợi ý (Gemma)', suggestion: ans, score: 1 }];
    } catch { return []; }
  }

  // --- 2. Chatbot ---
  async chat(history: { role: 'user' | 'model'; parts: string }[], message: string, userId: string) {
    if (!this.API_KEY) return "Hệ thống chưa cấu hình API Key.";

    const now = new Date();
    const todayStr = now.toLocaleDateString('vi-VN');

    const systemInstruction = `
    You are an internal IT/HR Assistant. Current date: ${todayStr}.
    
    RULES:
    1. Detect the user's input language and respond in that SAME language (e.g., if user asks in English, reply in English; if in Vietnamese, reply in Vietnamese) in a friendly tone.
    2. IF user wants to create a request (leave, IT support, WFH), YOU MUST OUTPUT JSON ONLY.
    3. DO NOT use Markdown formatting for JSON (no \`\`\`).
    
    REQUIRED JSON FORMAT for requests:
    {
      "action": "CREATE_TICKET",
      "data": {
        "category": "HR" (or "IT"),
        "typeKey": "leave_request" (or "it_support", "wfh_request"),
        "title": "Short summary",
        "description": "Full detail",
        "priority": "MEDIUM",
        "custom": {}
      }
    }
    `;

    const contents = [
      { role: 'user', parts: [{ text: systemInstruction }] },
      { role: 'model', parts: [{ text: "Ok, I understand. I will output strictly formatted JSON for requests and Vietnamese text for chat." }] },
      ...history.map(h => ({ role: h.role, parts: [{ text: h.parts }] })),
      { role: 'user', parts: [{ text: message }] }
    ];

    try {
      const response = await fetch(`${this.baseUrl}?key=${this.API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      });

      if (!response.ok) {
          const errText = await response.text();
          this.logger.error(`Gemma Error: ${errText}`);
          return "Gemma đang bận, thử lại sau nhé.";
      }

      const data = await response.json();
      const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // Kiểm tra xem có JSON trong câu trả lời không
      if (replyText.includes('{') && replyText.includes('CREATE_TICKET')) {
        try {
          const cleanText = this.cleanJsonString(replyText);
          const command = JSON.parse(cleanText);

          if (command.action === 'CREATE_TICKET' && command.data) {
            this.logger.log(`🤖 Gemma Creating Ticket for ${userId}`);
            const result = await this.requestsService.createWithRequester(userId, command.data, []);
            return `✅ Đã tạo phiếu thành công (Gemma)!\n\n📌 ID: #${result._id}\n📝 ${result.title}`;
          }
        } catch (err) {
            // FIX LỖI Ở ĐÂY: Ép kiểu err thành 'any' để lấy message
            this.logger.warn(`Lỗi parse JSON Gemma: ${(err as any).message}`);
        }
      }

      return replyText;

    } catch (e) {
      this.logger.error('Chat Exception', e);
      return "Lỗi kết nối AI.";
    }
  }
}