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
    const user = await this.users.findByEmail(email.toLowerCase());
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user._id.toString(), email: user.email, roles: user.roles };
    const accessToken = await this.jwt.signAsync(payload);

    return {
      accessToken,
      user: this.toSafeUser(user),
    };
  }

  private toSafeUser(u: User & { _id: any }) {
    return {
      _id: u._id.toString(),
      name: u.name,
      email: u.email,
      roles: u.roles ?? [],
    };
  }
}
