// Shared types for the mock bank application

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Staff (admin panel) roles — separate identity domain from bank customers.
export type StaffRole = 'admin' | 'auditor';

export interface JwtPayload {
  sub: number; // user id
  email: string;
}

export interface StaffJwtPayload {
  sub: number; // staff user id
  email: string;
  role: StaffRole;
  typ: 'staff';
}

export interface LithicWebhookEvent {
  event_type: string;
  token: string;
  payload: Record<string, unknown>;
}
