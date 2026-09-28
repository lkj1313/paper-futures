import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/error-response.dto.js';
import { UserResponseDto } from '../users/dto/user-response.dto.js';
import { AuthService } from './auth.service.js';
import { SignupDto } from './dto/signup.dto.js';

@ApiTags('auth')
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
}
