import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import argon2 from 'argon2';
import { AppException } from '../common/app.exception.js';
import { UsersService } from '../users/users.service.js';
import type { JwtPayload } from './auth.types.js';
import type { LoginDto } from './dto/login.dto.js';
import type { LoginResponseDto } from './dto/login-response.dto.js';
import type { SignupDto } from './dto/signup.dto.js';

@Injectable()
export class AuthService {
  // 없는 이메일로 로그인할 때도 비교 시간을 맞추기 위한 가짜 해시
  private readonly dummyHash = argon2.hash('dummy-password-for-timing');

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async signup({ email, password }: SignupDto) {
    const passwordHash = await argon2.hash(password);
    return this.usersService.create({ email, passwordHash });
  }

  async login({ email, password }: LoginDto): Promise<LoginResponseDto> {
    const user = await this.usersService.findByEmailWithPassword(email);

    // 없는 이메일이어도 비교를 한 번 수행해서, 응답 시간으로 가입 여부를 알 수 없게 한다
    const hash = user?.passwordHash ?? (await this.dummyHash);
    const isValid = await argon2.verify(hash, password);
    if (!user || !isValid) throw new AppException('INVALID_CREDENTIALS');

    const payload: JwtPayload = { sub: user.id };
    return { accessToken: await this.jwtService.signAsync(payload) };
  }
}
