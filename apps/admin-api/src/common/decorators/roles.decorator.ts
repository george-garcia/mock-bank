import { SetMetadata } from '@nestjs/common';
import { StaffRole } from '@mock-bank/types';

export const ROLES_KEY = 'roles';

/** Restrict a route (or controller) to the given staff roles. Use with RolesGuard. */
export const Roles = (...roles: StaffRole[]) => SetMetadata(ROLES_KEY, roles);
