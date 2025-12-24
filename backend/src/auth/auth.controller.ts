import { Body, Controller, Get, Post, Query } from '@nestjs/common'; // Sắp xếp lại import gọn gàng
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { IsEmail, IsString, MinLength } from 'class-validator'; // [FIX] Thêm import validator

// [FIX] Định nghĩa DTO để validate dữ liệu đầu vào
class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('login')
  async login(@Body() dto: LoginDto) { // [FIX] Dùng LoginDto thay vì any
    // [FIX] Truyền đúng 2 tham số tách biệt: email và password
    return this.authService.login(dto.email, dto.password);
  }

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    return this.usersService.verifyUser(token);
  }
}