export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export interface JwtPayload {
    sub: number;
    email: string;
}
export interface LithicWebhookEvent {
    event_type: string;
    token: string;
    payload: Record<string, unknown>;
}
