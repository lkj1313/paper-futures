import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/error-response.dto.js';
import { UserResponseDto } from '../users/dto/user-response.dto.js';
import { AuthService } from './auth.service.js';
import { LoginResponseDto } from './dto/login-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { SignupDto } from './dto/signup.dto.js';
import { Public } from './public.decorator.js';

@ApiTags('auth')
@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
  @ApiOperation({ summary: '로그인' })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiBadRequestResponse({
    description: '입력 값 오류 (VALIDATION_ERROR)',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: '이메일 또는 비밀번호 불일치 (INVALID_CREDENTIALS)',
    type: ErrorResponseDto,
  })
  login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(dto);
  }
}
