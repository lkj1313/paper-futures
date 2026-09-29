import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { MarketSymbol } from '@paper-futures/shared';
import { Public } from '../auth/public.decorator.js';
import { ErrorResponseDto } from '../common/error-response.dto.js';
import { MarketSummaryDto, OrderBookDto } from './dto/market.dto.js';
import { MarketService } from './market.service.js';
import { ParseMarketSymbolPipe } from './parse-market-symbol.pipe.js';

@ApiTags('markets')
@Public()
@Controller('markets')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Get()
  @ApiOperation({
    summary: '종목별 시세 요약 (최근 체결가, 마크가격, 펀딩비율)',
  })
  @ApiOkResponse({ type: [MarketSummaryDto] })
  getSummaries(): Promise<MarketSummaryDto[]> {
    return this.marketService.getSummaries();
  }

  @Get(':symbol/depth')
  @ApiOperation({ summary: '호가 20단계' })
  @ApiOkResponse({ type: OrderBookDto })
  @ApiNotFoundResponse({
    description: '지원하지 않는 종목 (NOT_FOUND)',
    type: ErrorResponseDto,
  })
  @ApiServiceUnavailableResponse({
    description: '호가를 아직 받지 못함 (MARKET_DATA_UNAVAILABLE)',
    type: ErrorResponseDto,
  })
  getDepth(
    @Param('symbol', ParseMarketSymbolPipe) symbol: MarketSymbol,
  ): Promise<OrderBookDto> {
    return this.marketService.getDepth(symbol);
  }
}
