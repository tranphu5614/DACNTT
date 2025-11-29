import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RequestsService } from '../requests/requests.service';

@Injectable()
export class KnowledgeService implements OnModuleInit {
  private readonly logger = new Logger(KnowledgeService.name);
  private readonly API_KEY: string;
  private baseUrl: string;
  private currentModelName: string = 'gemini-pro';

  constructor(
    private configService: ConfigService,
    @Inject(forwardRef(() => RequestsService))
    private requestsService: RequestsService,
  ) {
    this.API_KEY = this.configService.get<string>('GEMINI_API_KEY') || '';
    this.baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent`;
  }

  async onModuleInit() {
    if (!this.API_KEY) return;
    await this.findFreeModel();
  }

  private async findFreeModel() {
    try {
      this.logger.log('🔍 Auto-detecting best FREE model...');
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.API_KEY}`;
      const response = await fetch(listUrl);
      if (!response.ok) return;
      const data = await response.json();
      const models = data.models || [];
      const bestModel = 
        models.find((m: any) => m.name.includes('gemini-1.5-flash')) || 
        models.find((m: any) => m.name.includes('gemini-pro')) ||
        models.find((m: any) => m.supportedGenerationMethods?.includes('generateContent'));

      if (bestModel) {
        this.currentModelName = bestModel.name;
        this.baseUrl = `https://generativelanguage.googleapis.com/v1beta/${this.currentModelName}:generateContent`;
        this.logger.log(`✅ AI Model: ${this.currentModelName}`);
      }
    } catch (e) { /* ignore */ }
  }

  // Giữ nguyên hàm autocomplete cho chức năng gợi ý search
  async autocomplete(query: string) {
    if (!query || query.trim().length < 3) return [];
    if (!this.API_KEY) return [];
    try {
        const prompt = `Task: Identify if IT issue is COMPLEX (return "COMPLEX_ISSUE") or SIMPLE (return short solution). Input: "${query}"`;
        const response = await fetch(`${this.baseUrl}?key=${this.API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        if(!response.ok) return [];
        const data = await response.json();
        const ans = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (!ans || ans.includes('COMPLEX_ISSUE')) return [];
        return [{ id: 'ai-auto', title: '💡 Gợi ý (AI)', suggestion: ans, score: 1 }];
    } catch { return []; }
  }

  // --- Hàm Chatbot xử lý Ticket ---
  async chat(history: { role: 'user' | 'model'; parts: string }[], message: string, userId: string) {
    if (!this.API_KEY) return "Hệ thống chưa cấu hình API Key.";

    // 1. Lấy ngày giờ thực tế
    const now = new Date();
    const todayStr = now.toLocaleDateString('vi-VN', { 
      timeZone: 'Asia/Ho_Chi_Minh', 
      weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' 
    });
    // Format YYYY-MM-DD để dễ tính toán
    const isoDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

    const systemInstruction = `
      Bạn là Trợ lý ảo AI Agent của hệ thống.
      THÔNG TIN QUAN TRỌNG: Hôm nay là ${todayStr} (ISO: ${isoDate}).
      
      NHIỆM VỤ:
      1. Trả lời câu hỏi IT/HR thân thiện.
      2. NẾU user muốn tạo yêu cầu (nghỉ phép, máy lỗi, WFH...), hãy trả về JSON để hệ thống xử lý.
      3. Nếu không rõ hoặc không thể xử lý, hãy trả lời "Tôi không thể giúp với yêu cầu này."
      4. Trả lời theo ngôn ngữ mà người dùng hỏi.

      FORMAT JSON (Bắt buộc đúng định dạng này, không thêm markdown):
      {
        "action": "CREATE_TICKET",
        "data": {
          "category": "HR" | "IT",
          "typeKey": "leave_request" (nghỉ phép) | "it_support" (IT) | "wfh_request" (WFH),
          "title": "Tóm tắt yêu cầu",
          "description": "Chi tiết yêu cầu",
          "priority": "MEDIUM",
          "custom": {
            // Leave: "from", "to" (YYYY-MM-DD), "reason"
            // WFH: "date" (YYYY-MM-DD), "note"
            // IT: "device" (laptop/pc), "problem"
          }
        }
      }
      
      Ví dụ: "Xin nghỉ phép ngày mai vì ốm" (Hôm nay 2025-11-27)
      -> JSON: { "action": "CREATE_TICKET", "data": { "category": "HR", "typeKey": "leave_request", "title": "Nghỉ phép 2025-11-28", "description": "Xin nghỉ ốm", "custom": { "from": "2025-11-28", "to": "2025-11-28", "reason": "Ốm" } } }
    `;

    const contents = [
      { role: 'user', parts: [{ text: systemInstruction }] },
      ...history.map(h => ({ role: h.role, parts: [{ text: h.parts }] })),
      { role: 'user', parts: [{ text: message }] }
    ];

    try {
      const response = await fetch(`${this.baseUrl}?key=${this.API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      });

      if (!response.ok) return "Lỗi kết nối AI Service.";

      const data = await response.json();
      const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Không có phản hồi.";

      // 2. Kiểm tra xem AI có trả về lệnh JSON không
      const jsonMatch = replyText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const command = JSON.parse(jsonMatch[0]);
          if (command.action === 'CREATE_TICKET' && command.data) {
            this.logger.log(`🤖 AI Creating Ticket for ${userId}`);
            
            // Gọi Service tạo ticket
            const result = await this.requestsService.createWithRequester(userId, command.data, []);
            
            return `✅ Đã tạo yêu cầu thành công!\n\n📌 Mã phiếu: #${result._id}\n📝 Tiêu đề: ${result.title}\n\nBạn có thể kiểm tra trong mục "Yêu cầu của tôi".`;
          }
        } catch (err) {
          this.logger.warn('AI trả về JSON lỗi, hiển thị text gốc.');
        }
      }

      return replyText;

    } catch (e) {
      this.logger.error('Chat Exception', e);
      return "Hệ thống đang bận, vui lòng thử lại sau.";
    }
  }
}