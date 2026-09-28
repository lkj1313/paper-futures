import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { AppException } from '../common/app.exception.js';
import { ErrorResponseDto } from '../common/error-response.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: '토큰 없음, 위조, 만료 (UNAUTHORIZED)',
  type: ErrorResponseDto,
})
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: '내 정보 조회' })
  @ApiOkResponse({ type: UserResponseDto })
  async me(@CurrentUser() user: AuthUser): Promise<UserResponseDto> {
    // 토큰은 유효하지만 그사이 사용자가 사라졌을 수 있다
    const found = await this.usersService.findById(user.id);
    if (!found) throw new AppException('UNAUTHORIZED');
    return UserResponseDto.from(found);
  }
}
