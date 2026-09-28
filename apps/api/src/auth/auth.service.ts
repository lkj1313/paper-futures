import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import argon2 from 'argon2';
import { AppException } from '../common/app.exception.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { WalletService } from '../wallet/wallet.service.js';
import type { JwtPayload } from './auth.types.js';
import type { LoginDto } from './dto/login.dto.js';
import type { SignupDto } from './dto/signup.dto.js';
import { RefreshTokenService } from './refresh-token.service.js';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  // 없는 이메일로 로그인할 때도 비교 시간을 맞추기 위한 가짜 해시
  private readonly dummyHash = argon2.hash('dummy-password-for-timing');

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly walletService: WalletService,
    private readonly prisma: PrismaService,
  ) {}

  async signup({ email, password }: SignupDto) {
    // 해싱은 느린 작업이라 트랜잭션을 열기 전에 끝낸다
    const passwordHash = await argon2.hash(password);

    // 사용자, 지갑, 가입 보너스 원장을 하나로 묶는다. 하나라도 실패하면 모두 취소된다
    return this.prisma.transaction(async (tx) => {
      const user = await this.usersService.create({ email, passwordHash }, tx);
      await this.walletService.createWithSignupBonus(user.id, tx);
      return user;
    });
  }

  async login({ email, password }: LoginDto): Promise<AuthTokens> {
    const user = await this.usersService.findByEmailWithPassword(email);

    // 없는 이메일이어도 비교를 한 번 수행해서, 응답 시간으로 가입 여부를 알 수 없게 한다
    const hash = user?.passwordHash ?? (await this.dummyHash);
    const isValid = await argon2.verify(hash, password);
    if (!user || !isValid) throw new AppException('INVALID_CREDENTIALS');

    return {
      accessToken: await this.signAccessToken(user.id),
      refreshToken: await this.refreshTokenService.issue(user.id),
    };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const rotated = await this.refreshTokenService.rotate(refreshToken);

    // 토큰은 정상이지만 그사이 사용자가 사라졌을 수 있다
    const user = await this.usersService.findById(rotated.userId);
    if (!user) {
      await this.refreshTokenService.revoke(rotated.refreshToken);
      throw new AppException('INVALID_REFRESH_TOKEN');
    }

    return {
      accessToken: await this.signAccessToken(user.id),
      refreshToken: rotated.refreshToken,
    };
  }

  async logout(refreshToken: string | undefined) {
    if (refreshToken) await this.refreshTokenService.revoke(refreshToken);
  }

  private signAccessToken(userId: string) {
    const payload: JwtPayload = { sub: userId };
    return this.jwtService.signAsync(payload);
  }
}
