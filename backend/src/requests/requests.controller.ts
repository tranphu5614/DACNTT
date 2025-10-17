import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestsService } from './requests.service';

@UseGuards(JwtAuthGuard)
@Controller('requests')
export class RequestsController {
  constructor(private readonly svc: RequestsService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files', 5))
  async create(
    @Req() req: ExpressRequest,
    @Body()
    dto: {
      category: 'HR' | 'IT';
      typeKey: string;
      title: string;
      description: string;
      priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      custom?: any;
    },
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    const u: any = (req as any).user;
    const userId = u?.sub ?? u?._id;
    if (!userId) throw new UnauthorizedException('Missing or invalid token');

    if (dto?.custom && typeof dto.custom === 'string') {
      try { dto.custom = JSON.parse(dto.custom); } catch {}
    }
    return this.svc.createWithRequester(String(userId), dto, files);
  }

  @Get('mine')
  async mine(
    @Req() req: ExpressRequest,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit = 10,
  ) {
    const u: any = (req as any).user;
    const userId = u?.sub ?? u?._id;
    if (!userId) throw new UnauthorizedException('Missing or invalid token');
    return this.svc.listMine(String(userId), page, limit);
  }

  // ✅ MỚI: HÀNG CHỜ REQUEST
  @Get('queue')
  async queue(
    @Req() req: ExpressRequest,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('q') q?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit = 10,
  ) {
    if (!category) throw new BadRequestException('category is required (HR|IT)');
    const cat = String(category).toUpperCase();
    if (cat !== 'HR' && cat !== 'IT') {
      throw new BadRequestException('category must be HR or IT');
    }

    // Quyền xem hàng chờ: ADMIN luôn được; HR_* xem HR; IT_* xem IT
    const u: any = (req as any).user;
    const rolesRaw = u?.roles ?? u?.role ?? [];
    const roles: string[] = Array.isArray(rolesRaw)
      ? rolesRaw.map((r) => String(r).toUpperCase())
      : [String(rolesRaw).toUpperCase()];

    const isAdmin = roles.includes('ADMIN');
    const canHR = roles.includes('HR_MANAGER') || roles.includes('HR');
    const canIT = roles.includes('IT_MANAGER') || roles.includes('IT');

    if (!(isAdmin || (cat === 'HR' && canHR) || (cat === 'IT' && canIT))) {
      throw new ForbiddenException('Not allowed to view this queue');
    }

    return this.svc.listQueue(
      {
        category: cat as 'HR' | 'IT',
        status,
        priority,
        q,
      },
      page,
      limit,
    );
  }
}
