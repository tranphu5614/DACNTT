import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Types } from 'mongoose';

@Injectable()
export class AuthService {
  constructor(private users: UsersService, private jwt: JwtService) {}

  async register(dto: { email: string; name: string; password: string }) {
    const existed = await this.users.findByEmail(dto.email);
    if (existed) throw new ConflictException('Email đã tồn tại');
    return this.users.create(dto);
  }

  async login(dto: { email: string; password: string }) {
    const user = await this.users.findByEmail(dto.email, true);
    if (!user) throw new UnauthorizedException('Sai email hoặc mật khẩu');

    const ok = await bcrypt.compare(dto.password, (user as any).password);
    if (!ok) throw new UnauthorizedException('Sai email hoặc mật khẩu');

    // _id là Types.ObjectId (nhờ HydratedDocument)
    const userId = (user._id as Types.ObjectId).toString();

    const payload = {
      sub: userId,
      roles: user.roles,
      email: user.email,
      name: user.name,
    };

    const accessToken = await this.jwt.signAsync(payload);

    return {
      accessToken,
      user: { _id: user._id, email: user.email, name: user.name, roles: user.roles },
    };
  }
}
