import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    // Đăng ký Passport + defaultStrategy = 'jwt' (an toàn)
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // Đăng ký JwtModule
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'supersecret',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  providers: [AuthService, JwtStrategy],  // quan trọng: đưa JwtStrategy vào providers
  controllers: [AuthController],
  exports: [JwtModule, PassportModule],   // để guard/strategy dùng được ở module khác (nếu cần)
})
export class AuthModule {}
