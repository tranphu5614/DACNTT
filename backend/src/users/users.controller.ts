import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Patch, // Nhớ import Patch
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto'; // [MỚI] Import DTO
import { ListUsersQueryDto } from './dto/list-users.query';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // =================================================================
  // 1. PUBLIC / BASIC
  // =================================================================

  @Post('register')
  async register(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: Request) {
    const userId = (req.user as any)?.sub || (req.user as any)?._id;
    return this.usersService.findById(userId); 
  }

  @UseGuards(JwtAuthGuard)
  @Get('department/:dept')
  async getByDept(@Param('dept') dept: string) {
    if (!dept) throw new BadRequestException('Department is required');
    return this.usersService.findByDepartment(dept);
  }

  // =================================================================
  // 2. ADMIN ONLY
  // =================================================================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get()
  list(@Query() q: ListUsersQueryDto) {
    return this.usersService.list(q);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.createByAdmin(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.usersService.getProfile(id);
  }

  // [QUAN TRỌNG] API Update tổng hợp (Sửa thông tin + Role Manager)
  // Frontend UserDetailPage sẽ gọi vào đây
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    const currentUserId = (req.user as any)?.sub || (req.user as any)?._id;
    return this.usersService.deleteById(id, currentUserId);
  }
}