import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException } from '../common/app.exception.js';
import type { Env } from '../config/env.js';
import { RedisService } from '../redis/redis.service.js';

interface RefreshSession {
  userId: string;
  /** 한 번의 로그인에서 이어진 토큰 묶음. 도용이 감지되면 묶음 전체를 폐기한다 */
  familyId: string;
}

// 토큰 원문은 저장하지 않고 SHA-256 해시를 키로 쓴다
const key = {
  token: (hash: string) => `refresh:${hash}`,
  used: (hash: string) => `refresh-used:${hash}`,
  family: (familyId: string) => `refresh-family:${familyId}`,
};

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

@Injectable()
export class RefreshTokenService {
  readonly ttlSeconds: number;

  constructor(
    private readonly redis: RedisService,
    config: ConfigService<Env, true>,
  ) {
    this.ttlSeconds =
      config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true }) * 24 * 60 * 60;
  }

  /** 새 refresh 토큰을 발급한다. familyId가 없으면 새 로그인으로 보고 새 묶음을 만든다 */
  async issue(userId: string, familyId: string = randomUUID()) {
    const token = randomBytes(32).toString('base64url');
    const hash = sha256(token);
    const session: RefreshSession = { userId, familyId };

    await this.redis
      .multi()
      .set(key.token(hash), JSON.stringify(session), 'EX', this.ttlSeconds)
      .sadd(key.family(familyId), hash)
      .expire(key.family(familyId), this.ttlSeconds)
      .exec();

    return token;
  }

  /** 토큰을 폐기하고 같은 묶음의 새 토큰을 발급한다 */
  async rotate(token: string) {
    const hash = sha256(token);

    // 조회와 삭제를 한 번에 해서, 같은 토큰으로 동시에 요청해도 하나만 성공한다
    const raw = await this.redis.getdel(key.token(hash));
    if (!raw) {
      // 이미 교체된 토큰이 다시 쓰였다면 도용으로 보고 묶음 전체를 폐기한다
      const usedFamilyId = await this.redis.get(key.used(hash));
      if (usedFamilyId) await this.revokeFamily(usedFamilyId);
      throw new AppException('INVALID_REFRESH_TOKEN');
    }

    const { userId, familyId } = JSON.parse(raw) as RefreshSession;
    await this.redis
      .multi()
      .set(key.used(hash), familyId, 'EX', this.ttlSeconds)
      .srem(key.family(familyId), hash)
      .exec();

    return { userId, refreshToken: await this.issue(userId, familyId) };
  }

  /** 로그아웃: 이 토큰이 속한 묶음 전체를 폐기한다 */
  async revoke(token: string) {
    const raw = await this.redis.getdel(key.token(sha256(token)));
    if (!raw) return;
    const { familyId } = JSON.parse(raw) as RefreshSession;
    await this.revokeFamily(familyId);
  }

  private async revokeFamily(familyId: string) {
    const hashes = await this.redis.smembers(key.family(familyId));
    await this.redis.del(key.family(familyId), ...hashes.map(key.token));
  }
}
