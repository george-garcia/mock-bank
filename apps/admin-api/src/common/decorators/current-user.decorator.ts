import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { StaffRole } from '@mock-bank/types';

/** The authenticated staff principal, as returned by StaffJwtStrategy.validate(). */
export interface StaffPrincipal {
  sub: number;
  email: string;
  role: StaffRole;
}

export const CurrentUser = createParamDecorator(
  (data: keyof StaffPrincipal | undefined, ctx: ExecutionContext) => {
    const user = ctx.switchToHttp().getRequest().user as StaffPrincipal;
    return data ? user?.[data] : user;
  },
);
