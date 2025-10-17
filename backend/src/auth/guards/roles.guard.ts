import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ROLES_KEY = 'roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required?.length) return true;

    const { user } = ctx.switchToHttp().getRequest();
    const userRoles = Array.isArray(user?.roles)
      ? user.roles.map((r: string) => String(r).toUpperCase())
      : [];

    const requiredUpper = required.map((r) => String(r).toUpperCase());
    return requiredUpper.some((r) => userRoles.includes(r));
  }
}
