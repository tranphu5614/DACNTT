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
  Res, // [MỚI] Dùng cho Export Excel
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Response } from 'express'; // [MỚI] Type cho Response
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestsService } from './requests.service';
import { RoomSize } from './rooms.constants';
import { CreateRequestDto } from './dto/create-request.dto';

function extractUserId(user: any): string | undefined {
  return user?.userId ?? user?.sub ?? user?._id ?? user?.id ?? user?.uid;
}

@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  // ==================================================================
  // 1. CÁC API THỐNG KÊ & DANH SÁCH (QUAN TRỌNG: Đặt lên trên cùng)
  // ==================================================================

  // [MỚI] Thống kê Dashboard
  @UseGuards(JwtAuthGuard)
  @Get('dashboard/stats')
  async getStats(@Query('category') category?: string) { // <--- Thêm tham số này
    return this.requestsService.getDashboardStats(category);
  }

  // [MỚI] Xuất báo cáo Excel
  @UseGuards(JwtAuthGuard)
  @Get('export/excel')
  async exportExcel(@Res() res: Response) {
    const workbook = await this.requestsService.exportToExcel();
    
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=' + 'requests_export.xlsx',
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  // Kiểm tra phòng họp trống
  @UseGuards(JwtAuthGuard)
  @Get('available-rooms')
  async availableRooms(
    @Query('date') date: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('size') size: RoomSize,
  ) {
    return this.requestsService.getAvailableRooms(date, from, to, size);
  }

  // "Yêu cầu của tôi"
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

  // Hàng chờ xử lý (Generic cho mọi phòng ban)
  @UseGuards(JwtAuthGuard)
  @Get('queue')
  async queue(
    @Req() req: any,
    @Query('category') category: string, // String bất kỳ (HR, IT, SALES...)
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!category) throw new BadRequestException('Thiếu tham số category');

    const roles: string[] = (req?.user?.roles ?? []).map((r: any) => String(r).toUpperCase());

    // Logic phân quyền: ADMIN hoặc MANAGER đều xem được
    const isManager = roles.includes('ADMIN') || roles.includes('MANAGER');
    
    // Tương thích ngược với các role cũ
    const isSpecificManager = 
      (category === 'HR' && (roles.includes('HR_MANAGER') || roles.includes('HR'))) ||
      (category === 'IT' && (roles.includes('IT_MANAGER') || roles.includes('IT')));

    if (!isManager && !isSpecificManager) {
      throw new ForbiddenException(`Bạn không có quyền xem hàng chờ ${category}`);
    }

    const p = page ? parseInt(page, 10) || 1 : 1;
    const l = limit ? parseInt(limit, 10) || 10 : 10;

    return this.requestsService.listQueue({ category, status, priority, q }, p, l);
  }

  // Lấy danh sách cần duyệt (Approval)
  @UseGuards(JwtAuthGuard)
  @Get('pending-approval')
  async pendingApproval(@Req() req: any) {
    return this.requestsService.listPendingForApprover(req.user);
  }

  // ==================================================================
  // 2. CÁC API CHI TIẾT & THAO TÁC (Đặt bên dưới các route get tĩnh)
  // ==================================================================

  // Tạo Request mới
  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(FilesInterceptor('files'))
  async create(
    @Req() req: any,
    @Body() body: CreateRequestDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const userId = extractUserId(req?.user);
    if (!userId) {
      throw new BadRequestException('Không xác định được user từ JWT.');
    }
    return this.requestsService.createWithRequester(userId, body, files);
  }

  // Lấy chi tiết 1 Request (Route động :id phải nằm sau route tĩnh)
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.requestsService.getById(id);
  }

  // [MỚI] Thêm Comment
  @UseGuards(JwtAuthGuard)
  @Post(':id/comments')
  async addComment(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { content: string; isInternal?: boolean },
  ) {
    const userId = extractUserId(req.user);
    if (!userId) throw new BadRequestException('User not found');
    return this.requestsService.addComment(id, userId, body.content, !!body.isInternal);
  }

  // [MỚI] Giao việc (Assign)
  @UseGuards(JwtAuthGuard)
  @Patch(':id/assign')
  async assignRequest(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { assigneeId: string },
  ) {
    const roles: string[] = (req?.user?.roles ?? []).map((r: any) => String(r).toUpperCase());
    // Chỉ Admin hoặc các Manager mới được giao việc
    if (!roles.includes('ADMIN') && !roles.includes('MANAGER') && !roles.includes('IT_MANAGER') && !roles.includes('HR_MANAGER')) {
       throw new ForbiddenException('Bạn không có quyền giao việc.');
    }
    
    return this.requestsService.assignRequest(id, body.assigneeId);
  }

  // Duyệt (Approve)
  @UseGuards(JwtAuthGuard)
  @Patch(':id/approve')
  async approve(
    @Param('id') id: string,
    @Req() req: any,
    @Body('comment') comment?: string,
  ) {
    return this.requestsService.approve(id, req.user, comment);
  }

  // Từ chối (Reject)
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