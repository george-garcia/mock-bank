import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || 'unknown';
    const start = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const contentLength = res.get('content-length') || 0;
      const duration = Date.now() - start;

      const logData = {
        method,
        url: originalUrl,
        statusCode,
        contentLength,
        duration: `${duration}ms`,
        ip,
        userAgent,
      };

      if (statusCode >= 500) {
        this.logger.error(`Request failed`, JSON.stringify(logData));
      } else if (statusCode >= 400) {
        this.logger.warn(`Request warning`, JSON.stringify(logData));
      } else {
        this.logger.log(`Request completed`, JSON.stringify(logData));
      }
    });

    next();
  }
}
