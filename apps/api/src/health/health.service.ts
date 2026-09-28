import { Injectable } from '@nestjs/common';
import { AppException } from '../common/app.exception.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new AppException('SERVICE_UNAVAILABLE', {
        message: 'DB에 연결할 수 없습니다.',
      });
    }
    return { status: 'ok', db: 'ok' };
  }
}
