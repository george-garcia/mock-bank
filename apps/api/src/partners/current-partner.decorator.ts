import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedPartner } from './partner-api-key.guard';

/** Inject the partner authenticated by PartnerApiKeyGuard (or one of its fields). */
export const CurrentPartner = createParamDecorator(
  (data: keyof AuthenticatedPartner | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const partner = request.partner as AuthenticatedPartner | undefined;
    return data ? partner?.[data] : partner;
  },
);
