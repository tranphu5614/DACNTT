import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'supersecret', // Đảm bảo khớp secret
    });
  }

  async validate(payload: any) {
    // [CẬP NHẬT] Trả về object user đầy đủ thông tin từ token
    return {
        userId: payload.sub,
        _id: payload.sub,
        email: payload.email,
        name: payload.name,
        roles: payload.roles,
        
        // QUAN TRỌNG: Lấy department từ payload ra để dùng
        department: payload.department 
    };
  }
}