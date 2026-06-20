import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verifies inbound Lithic webhooks using Lithic's real signing scheme (Svix). Each request carries
 * `webhook-id`, `webhook-timestamp`, and `webhook-signature` headers; the secret is `whsec_<base64>`.
 * The signature is base64(HMAC-SHA256(secret, `${id}.${timestamp}.${rawBody}`)). The header may list
 * several space-delimited `v1,<sig>` entries; any match passes (constant-time compare).
 *
 * If LITHIC_WEBHOOK_SECRET is unset (mock/dev), verification is skipped with a warning.
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
    const id: string | undefined = req.headers['webhook-id'];
    const timestamp: string | undefined = req.headers['webhook-timestamp'];
    const signatureHeader: string | undefined = req.headers['webhook-signature'];
    const raw: Buffer | undefined = req.rawBody;
    if (!id || !timestamp || !signatureHeader || !raw) {
      throw new UnauthorizedException('Missing webhook signature headers');
    }

    // The signing key is the base64 portion after the `whsec_` prefix.
    const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
    const signedContent = `${id}.${timestamp}.${raw.toString('utf8')}`;
    const expected = createHmac('sha256', key).update(signedContent).digest('base64');

    // The header is a space-delimited list of `version,signature` (e.g. `v1,<base64>`).
    const provided = signatureHeader.split(' ').map((part) => part.split(',')[1] ?? part);
    const ok = provided.some((sig) => this.safeEqual(sig, expected));
    if (!ok) throw new UnauthorizedException('Invalid webhook signature');
    return true;
  }

  private safeEqual(a: string, b: string): boolean {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    return ab.length === bb.length && timingSafeEqual(ab, bb);
  }
}
