import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verifies inbound Lithic webhooks via an HMAC-SHA256 signature over the raw request body.
 * If LITHIC_WEBHOOK_SECRET is unset (mock/dev), verification is skipped with a warning —
 * in production the secret must be set so forged events are rejected.
 */
@Injectable()
export class LithicWebhookGuard implements CanActivate {
  private readonly logger = new Logger(LithicWebhookGuard.name);

  constructor(private config: ConfigService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const secret = this.config.get<string>('LITHIC_WEBHOOK_SECRET');
    if (!secret) {
      this.logger.warn('LITHIC_WEBHOOK_SECRET not set — skipping webhook signature verification (mock mode)');
      return true;
    }

    const req = ctx.switchToHttp().getRequest();
    const signature: string | undefined = req.headers['x-lithic-webhook-signature'];
    const raw: Buffer | undefined = req.rawBody;
    if (!signature || !raw) {
      throw new UnauthorizedException('Missing webhook signature');
    }

    const expected = createHmac('sha256', secret).update(raw).digest('hex');
    if (!this.safeEqual(signature, expected)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
    return true;
  }

  private safeEqual(a: string, b: string): boolean {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    return ab.length === bb.length && timingSafeEqual(ab, bb);
  }
}
