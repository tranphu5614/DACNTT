import { Controller, Get, Post, Patch, Body, Param, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CrmService } from './crm.service';
import { CrmStatus } from './schemas/crm.schema';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  // 1. Xem danh sách
  @Get()
  @Roles('ADMIN', 'SALE_MANAGER', 'SALE_STAFF', 'USER')
  async getAll(@Req() req: any) {
    return this.crmService.findAll(req.user);
  }

  // 2. Xem chi tiết
  @Get(':id')
  @Roles('ADMIN', 'SALE_MANAGER', 'SALE_STAFF', 'USER')
  async getDetail(@Param('id') id: string) {
    return this.crmService.findOne(id);
  }

  // 3. Tạo mới
  @Post()
  @Roles('ADMIN', 'SALE_MANAGER', 'SALE_STAFF', 'USER')
  async createDeal(@Body() body: any, @Req() req: any) {
    return this.crmService.createBySale(req.user.userId, body);
  }

  // 4. Bình luận
  @Post(':id/comments')
  @Roles('ADMIN', 'SALE_MANAGER', 'SALE_STAFF', 'USER')
  async addComment(@Param('id') id: string, @Body() body: { content: string }, @Req() req: any) {
    return this.crmService.addComment(id, req.user.userId, body.content);
  }

  // 5. Phân công (ĐÃ FIX TYPE ERROR)
  @Patch(':id/assign')
  @Roles('ADMIN', 'SALE_MANAGER', 'SALE_STAFF', 'USER')
  async assignDeal(@Param('id') id: string, @Body('userId') rawUserId: string, @Req() req: any) {
    const currentUser = req.user;
    const isManager = currentUser.roles.includes('ADMIN') || currentUser.roles.includes('SALE_MANAGER');

    // [FIX]: Khai báo rõ kiểu là string HOẶC null để TypeScript không báo lỗi
    let targetUserId: string | null = rawUserId;
    
    // Logic biến đổi chuỗi rỗng thành null
    if (targetUserId === "" || targetUserId === "null" || !targetUserId) {
        targetUserId = null; 
    }

    // Nếu không phải Manager, kiểm tra quyền
    if (!isManager) {
      // User thường chỉ được phép tự nhận việc (targetUserId === currentUser.userId)
      if (targetUserId !== currentUser.userId) {
        throw new ForbiddenException('Bạn chỉ có thể tự nhận việc cho chính mình.');
      }
    }

    // Truyền targetUserId (đã là null hoặc valid ObjectId) xuống service
    return this.crmService.assignDeal(id, targetUserId, currentUser.userId);
  }

  // 6. Cập nhật trạng thái
  @Patch(':id/status')
  @Roles('ADMIN', 'SALE_MANAGER', 'SALE_STAFF', 'USER')
  async updateStatus(@Param('id') id: string, @Body() body: { status: CrmStatus; note?: string }, @Req() req: any) {
    return this.crmService.updateStatus(id, body.status, body.note, req.user.userId);
  }
}