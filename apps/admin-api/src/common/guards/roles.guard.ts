import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { StaffRole } from '@mock-bank/types';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Enforces @Roles(...) on a route. Must run after StaffAuthGuard so request.user (the
 * authenticated staff principal, with its role) is populated.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<StaffRole[]>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!required || required.length === 0) return true;
    const role: StaffRole | undefined = ctx.switchToHttp().getRequest().user?.role;
    if (!role || !required.includes(role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
