import { Body, Controller, Post, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { IsEmail, IsString, MinLength } from 'class-validator';

// =================================================================
// 1. DATA TRANSFER OBJECTS (DTOs)
// =================================================================

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

class ActivateAccountDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

// [MỚI] DTO cho Quên mật khẩu
class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

// [MỚI] DTO cho Đặt lại mật khẩu
class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

// =================================================================
// 2. CONTROLLER
// =================================================================

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Post('activate')
  async activateAccount(@Body() dto: ActivateAccountDto) {
    if (!dto.token || !dto.password) {
       throw new BadRequestException('Vui lòng cung cấp đầy đủ token và mật khẩu mới.');
    }
    return this.usersService.activateAccount(dto.token, dto.password);
  }

  // [MỚI] API yêu cầu quên mật khẩu
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.usersService.forgotPassword(dto.email);
  }

  // [MỚI] API đặt lại mật khẩu (dùng token từ email)
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.usersService.resetPassword(dto.token, dto.password);
  }
}