import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid email or password');

    const ok = await bcrypt.compare(password, (user as any).password || '');
    if (!ok) throw new UnauthorizedException('Invalid email or password');

    const payload = {
      sub: (user as any)._id?.toString?.() || (user as any)._id,
      email: user.email,
      name: user.name,
      roles: user.roles || [],
    };
    const accessToken = await this.jwt.signAsync(payload);

    // Ẩn password khi trả về
    const { password: _, ...safeUser } = user as any;
    return { accessToken, user: { ...safeUser, _id: payload.sub } as User };
  }
}
