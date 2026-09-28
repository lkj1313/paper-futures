import { Injectable } from '@nestjs/common';
import { AppException } from '../common/app.exception.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { email: string; passwordHash: string }) {
    try {
      return await this.prisma.user.create({ data });
    } catch (error) {
      // 먼저 조회하고 저장하면 동시 요청 시 둘 다 통과할 수 있으므로,
      // DB의 unique 제약 위반(P2002)을 중복 가입으로 판단한다
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new AppException('EMAIL_ALREADY_EXISTS');
      }
      throw error;
    }
  }
}
