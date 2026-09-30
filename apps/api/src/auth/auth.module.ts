import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import type { Env } from '../config/env.js';
import { UsersModule } from '../users/users.module.js';
import { WalletModule } from '../wallet/wallet.module.js';
import { AuthController } from './auth.controller.js';
import { JwtAuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { RefreshTokenService } from './refresh-token.service.js';

// '15m' 같은 형식만 받는 타입. 형식은 환경변수 검증(env.ts)에서 이미 확인했다
type ExpiresIn = Exclude<NonNullable<JwtSignOptions['expiresIn']>, number>;

@Module({
  imports: [
    UsersModule,
    WalletModule,
    // 비밀키를 ConfigService에서 받아와야 하므로 registerAsync를 쓴다
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_ACCESS_SECRET', { infer: true }),
        signOptions: {
          expiresIn: config.get('JWT_ACCESS_EXPIRES_IN', {
            infer: true,
          }) as ExpiresIn,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    RefreshTokenService,
    // 모든 API에 JwtAuthGuard를 적용한다 (@Public()만 예외)
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  // 실시간 연결도 같은 설정으로 토큰을 검사한다
  exports: [JwtModule],
})
export class AuthModule {}
