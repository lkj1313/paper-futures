import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { MarketSymbol } from '@paper-futures/shared';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ErrorResponseDto } from '../common/error-response.dto.js';
import { ParseMarketSymbolPipe } from '../market/parse-market-symbol.pipe.js';
import {
  LeverageSettingDto,
  LeverageSettingsDto,
} from './dto/leverage-response.dto.js';
import { UpdateLeverageDto } from './dto/update-leverage.dto.js';
import { LeverageService } from './leverage.service.js';

@ApiTags('leverage')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: '토큰 없음, 위조 (UNAUTHORIZED) 또는 만료 (TOKEN_EXPIRED)',
  type: ErrorResponseDto,
})
@Controller('leverage')
export class LeverageController {
  constructor(private readonly leverageService: LeverageService) {}

  @Get()
  @ApiOperation({
    summary: '종목별 레버리지 설정',
    description: '정한 적 없는 종목은 기본 10배',
  })
  @ApiOkResponse({ type: LeverageSettingsDto })
  getAll(@CurrentUser() user: AuthUser): Promise<LeverageSettingsDto> {
    return this.leverageService.getAll(user.id);
  }

  @Put(':symbol')
  @ApiOperation({
    summary: '종목 레버리지 변경',
    description:
      '이후 그 종목에서 새로 여는 포지션에 쓴다. 그 종목 포지션이 열려 있으면 바꿀 수 없다.',
  })
  @ApiOkResponse({ type: LeverageSettingDto })
  @ApiBadRequestResponse({
    description: 'VALIDATION_ERROR, INVALID_LEVERAGE (종목 최대 초과)',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: '지원하지 않는 종목 (NOT_FOUND)',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: '그 종목 포지션이 열려 있음 (LEVERAGE_LOCKED)',
    type: ErrorResponseDto,
  })
  async update(
    @CurrentUser() user: AuthUser,
    @Param('symbol', ParseMarketSymbolPipe) symbol: MarketSymbol,
    @Body() dto: UpdateLeverageDto,
  ): Promise<LeverageSettingDto> {
    const leverage = await this.leverageService.update(
      user.id,
      symbol,
      dto.leverage,
    );
    return { symbol, leverage };
  }
}
