import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AppException } from '../common/app.exception.js';
import { ErrorResponseDto } from '../common/error-response.dto.js';
import type { Env } from '../config/env.js';
import { UserResponseDto } from '../users/dto/user-response.dto.js';
import { AuthService } from './auth.service.js';
import { LoginResponseDto } from './dto/login-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { SignupDto } from './dto/signup.dto.js';
import { Public } from './public.decorator.js';
import {
  clearRefreshCookie,
  readRefreshCookie,
  REFRESH_COOKIE,
  setRefreshCookie,
} from './refresh-cookie.js';
import { RefreshTokenService } from './refresh-token.service.js';

@ApiTags('auth')
@Public()
@Controller('auth')
export class AuthController {
  private readonly cookieConfig: { secure: boolean; maxAgeSeconds: number };

  constructor(
    private readonly authService: AuthService,
    refreshTokenService: RefreshTokenService,
    config: ConfigService<Env, true>,
  ) {
    this.cookieConfig = {
      secure: config.get('NODE_ENV', { infer: true }) === 'production',
      maxAgeSeconds: refreshTokenService.ttlSeconds,
    };
  }

  @Post('signup')
  @ApiOperation({ summary: '회원가입' })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({
    description: '입력 값 오류 (VALIDATION_ERROR)',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: '이미 가입된 이메일 (EMAIL_ALREADY_EXISTS)',
    type: ErrorResponseDto,
  })
  async signup(@Body() dto: SignupDto): Promise<UserResponseDto> {
    const user = await this.authService.signup(dto);
    return UserResponseDto.from(user);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '로그인',
    description:
      'accessToken은 응답 본문으로, refresh 토큰은 httpOnly 쿠키로 준다.',
  })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiBadRequestResponse({
    description: '입력 값 오류 (VALIDATION_ERROR)',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: '이메일 또는 비밀번호 불일치 (INVALID_CREDENTIALS)',
    type: ErrorResponseDto,
  })
  async login(
    @Body() dto: LoginDto,
    // 쿠키를 설정하려고 응답 객체를 쓰지만, 본문은 평소처럼 return으로 보낸다
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const { accessToken, refreshToken } = await this.authService.login(dto);
    setRefreshCookie(res, refreshToken, this.cookieConfig);
    return { accessToken };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiOperation({
    summary: '토큰 갱신',
    description:
      'refresh 쿠키로 새 accessToken을 받는다. refresh 토큰도 새로 교체된다.',
  })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({
    description: 'refresh 토큰 없음, 만료, 폐기 (INVALID_REFRESH_TOKEN)',
    type: ErrorResponseDto,
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const token = readRefreshCookie(req);
    try {
      if (!token) throw new AppException('INVALID_REFRESH_TOKEN');
      const { accessToken, refreshToken } =
        await this.authService.refresh(token);
      setRefreshCookie(res, refreshToken, this.cookieConfig);
      return { accessToken };
    } catch (error) {
      // 쓸 수 없는 쿠키는 지워서 브라우저가 계속 보내지 않게 한다
      clearRefreshCookie(res, this.cookieConfig);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiOperation({
    summary: '로그아웃',
    description:
      'access 토큰이 만료된 상태에서도 로그아웃할 수 있도록 공개 API로 둔다.',
  })
  @ApiNoContentResponse({ description: '로그아웃 완료, refresh 쿠키 삭제' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.logout(readRefreshCookie(req));
    clearRefreshCookie(res, this.cookieConfig);
  }
}
