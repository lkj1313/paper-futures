import { Injectable } from '@nestjs/common';
import { AppException } from '../common/app.exception.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService, type PrismaTx } from '../prisma/prisma.service.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** db를 넘기면 그 트랜잭션 안에서 만든다 */
  async create(
    data: { email: string; passwordHash: string },
    db: PrismaTx = this.prisma,
  ) {
    try {
      return await db.user.create({ data });
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

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  /** 로그인 검증용. 비밀번호 해시를 포함해서 가져온다 */
  findByEmailWithPassword(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      omit: { passwordHash: false },
    });
  }
}
