// backend/src/requests/requests.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestsService } from './requests.service';
import { RoomSize } from './rooms.constants';

function extractUserId(user: any): string | undefined {
  // hỗ trợ nhiều dạng payload từ JwtStrategy
  return user?.userId ?? user?.sub ?? user?._id ?? user?.id ?? user?.uid;
}

@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  // ========== PHÒNG HỌP ==========
  @UseGuards(JwtAuthGuard)
  @Get('available-rooms')
  async availableRooms(
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('size') size: RoomSize,
  ) {
    return this.requestsService.getAvailableRooms(start, end, size);
  }

  // ========== TẠO REQUEST ==========
  // Hỗ trợ upload nhiều file qua field 'files'
  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(FilesInterceptor('files'))
  async create(
    @Req() req: any,
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const userId = extractUserId(req?.user);
    if (!userId) {
      throw new BadRequestException('Không xác định được user từ JWT (thiếu sub/userId).');
    }
    return this.requestsService.createWithRequester(userId, body, files);
  }

  // ========== "YÊU CẦU CỦA TÔI" ==========
  @UseGuards(JwtAuthGuard)
  @Get('mine')
  async mine(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = extractUserId(req?.user);
    if (!userId) throw new BadRequestException('Không xác định được user từ JWT.');
    const p = page ? parseInt(page, 10) || 1 : 1;
    const l = limit ? parseInt(limit, 10) || 10 : 10;
    return this.requestsService.listMine(userId, p, l);
  }

  // ========== HÀNG CHỜ HR/IT ==========
  @UseGuards(JwtAuthGuard)
  @Get('queue')
  async queue(
    @Req() req: any,
    @Query('category') category: 'HR' | 'IT',
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!category) throw new BadRequestException('Thiếu tham số category (HR|IT)');

    // RBAC nhanh; ADMIN xem tất
    const roles: string[] = req?.user?.roles ?? [];
    if (!roles.includes('ADMIN')) {
      if (category === 'HR' && !roles.some((r) => r === 'HR' || r === 'HR_MANAGER')) {
        throw new ForbiddenException('Bạn không có quyền xem hàng chờ HR');
      }
      if (category === 'IT' && !roles.some((r) => r === 'IT' || r === 'IT_MANAGER')) {
        throw new ForbiddenException('Bạn không có quyền xem hàng chờ IT');
      }
    }

    const p = page ? parseInt(page, 10) || 1 : 1;
    const l = limit ? parseInt(limit, 10) || 10 : 10;

    return this.requestsService.listQueue({ category, status, priority, q }, p, l);
  }

  // ========== LẤY REQUEST ĐANG CHỜ USER HIỆN TẠI DUYỆT ==========
  @UseGuards(JwtAuthGuard)
  @Get('pending-approval')
  async pendingApproval(@Req() req: any) {
    return this.requestsService.listPendingForApprover(req.user);
  }

  // ========== XEM CHI TIẾT 1 REQUEST ==========
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.requestsService.getById(id);
  }

  // ========== DUYỆT ==========
  @UseGuards(JwtAuthGuard)
  @Patch(':id/approve')
  async approve(
    @Param('id') id: string,
    @Req() req: any,
    @Body('comment') comment?: string,
  ) {
    return this.requestsService.approve(id, req.user, comment);
  }

  // ========== TỪ CHỐI ==========
  @UseGuards(JwtAuthGuard)
  @Patch(':id/reject')
  async reject(
    @Param('id') id: string,
    @Req() req: any,
    @Body('comment') comment?: string,
  ) {
    return this.requestsService.reject(id, req.user, comment);
  }
}
