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
import { ErrorResponseDto } from '../common/error-response.dto.js';
import { PositionViewDto } from './dto/position-view.dto.js';
import { PositionsService } from './positions.service.js';

@ApiTags('positions')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: '토큰 없음, 위조 (UNAUTHORIZED) 또는 만료 (TOKEN_EXPIRED)',
  type: ErrorResponseDto,
})
@Controller('positions')
export class PositionsController {
  constructor(private readonly positionsService: PositionsService) {}

  @Get()
  @ApiOperation({
    summary: '내 열린 포지션',
    description: '마크가격 기준 미실현 손익, ROE, 청산가를 함께 준다.',
  })
  @ApiOkResponse({ type: [PositionViewDto] })
  list(@CurrentUser() user: AuthUser): Promise<PositionViewDto[]> {
    return this.positionsService.list(user.id);
  }
}
