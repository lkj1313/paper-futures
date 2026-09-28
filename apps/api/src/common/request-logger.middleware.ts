import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const start = performance.now();
    // 응답이 끝난 시점에 기록해야 에러 응답의 상태 코드까지 남는다
    res.on('finish', () => {
      const ms = Math.round(performance.now() - start);
      this.logger.log(
        `${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`,
      );
    });
    next();
  }
}
