/**
 * src/common/filters/all-exceptions.filter.ts
 * Bắt mọi exception, format response thống nhất
 */
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : (exception as Error).message;

    if (status >= 500) {
      this.logger.error(`${request.method} ${request.url}: ${(exception as Error).stack}`);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message: typeof message === 'object' ? (message as any).message ?? message : message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
