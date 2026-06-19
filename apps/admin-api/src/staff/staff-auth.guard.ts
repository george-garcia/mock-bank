import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Authenticates admin-panel requests via the staff-jwt strategy. */
@Injectable()
export class StaffAuthGuard extends AuthGuard('staff-jwt') {}
