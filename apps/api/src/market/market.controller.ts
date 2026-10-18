import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { MarketSymbol } from '@paper-futures/shared';
import { Public } from '../auth/public.decorator.js';
import { ErrorResponseDto } from '../common/error-response.dto.js';
import { CandleDto, CandlesQueryDto } from './dto/candle.dto.js';
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

  @Get(':symbol/candles')
  @ApiOperation({
    summary: '지난 캔들 (오래된 것부터)',
    description:
      '바이낸스에서 받아 그대로 준다. 마지막 봉은 아직 진행 중일 수 있고, 이후 갱신은 소켓 candle 이벤트로 받는다.',
  })
  @ApiOkResponse({ type: [CandleDto] })
  @ApiBadRequestResponse({
    description: '봉 간격이나 개수가 잘못됨 (VALIDATION_ERROR)',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: '지원하지 않는 종목 (NOT_FOUND)',
    type: ErrorResponseDto,
  })
  @ApiServiceUnavailableResponse({
    description: '바이낸스에서 받지 못함 (MARKET_DATA_UNAVAILABLE)',
    type: ErrorResponseDto,
  })
  getCandles(
    @Param('symbol', ParseMarketSymbolPipe) symbol: MarketSymbol,
    @Query() query: CandlesQueryDto,
  ): Promise<CandleDto[]> {
    return this.marketService.getCandles(symbol, query.interval, query.limit);
  }
}
