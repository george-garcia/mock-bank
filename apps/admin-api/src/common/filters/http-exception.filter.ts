import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? (exception.getResponse() as any).message || exception.message
        : 'Internal server error';

    if (exception instanceof Error) {
      this.logger.error(`Exception: ${exception.message}`, exception.stack, `${request.method} ${request.url}`);
    } else {
      this.logger.error('Unknown exception', exception as string);
    }

    response.status(status).json({
      success: false,
      error: message,
      message: typeof message === 'string' ? message : message[0],
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
