import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Patch,
  Put, // [MỚI]
  Query,
  Req,
  UseGuards,
  BadRequestException,
  UseInterceptors, // [MỚI]
  UploadedFile,    // [MỚI]
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express'; // [MỚI]
import { diskStorage } from 'multer'; // [MỚI]
import { extname } from 'path';       // [MỚI]
import { Request } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersQueryDto } from './dto/list-users.query';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // =================================================================
  // 1. PUBLIC / BASIC / PROFILE
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

  // [MỚI] API Upload Avatar cho chính mình
  @UseGuards(JwtAuthGuard)
  @Put('me/avatar')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/avatars', // Đảm bảo thư mục này tồn tại
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        callback(null, `avatar-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, callback) => {
       if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
           return callback(new BadRequestException('Chỉ chấp nhận file ảnh (jpg, jpeg, png, gif)!'), false);
       }
       callback(null, true);
    }
  }))
  async uploadAvatar(@Req() req: Request, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Không có file được upload');
    
    const userId = (req.user as any)?.sub || (req.user as any)?._id;
    
    // Lưu đường dẫn tương đối (để frontend ghép với BASE_URL)
    const avatarUrl = `avatars/${file.filename}`; 

    // Gọi service update
    await this.usersService.update(userId, { avatar: avatarUrl } as UpdateUserDto);

    return { 
      message: 'Upload ảnh đại diện thành công', 
      avatar: avatarUrl 
    };
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