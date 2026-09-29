import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ErrorResponseDto } from '../common/error-response.dto.js';
import {
  OrderDto,
  PlaceOrderResponseDto,
  PositionDto,
} from './dto/order-response.dto.js';
import { PlaceOrderDto } from './dto/place-order.dto.js';
import { OrdersService } from './orders.service.js';

@ApiTags('orders')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: '토큰 없음, 위조 (UNAUTHORIZED) 또는 만료 (TOKEN_EXPIRED)',
  type: ErrorResponseDto,
})
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({
    summary: '시장가 주문',
    description:
      '호가 기준으로 즉시 체결한다. 포지션과 같은 방향이면 열기/늘리기, 반대 방향이면 줄이기/닫기.',
  })
  @ApiCreatedResponse({ type: PlaceOrderResponseDto })
  @ApiBadRequestResponse({
    description:
      'VALIDATION_ERROR, INVALID_ORDER_QTY, INVALID_LEVERAGE, INSUFFICIENT_MARGIN, INSUFFICIENT_LIQUIDITY, POSITION_FLIP_NOT_SUPPORTED, REDUCE_ONLY_REJECTED',
    type: ErrorResponseDto,
  })
  @ApiServiceUnavailableResponse({
    description: '시세가 없거나 지연됨 (MARKET_DATA_UNAVAILABLE)',
    type: ErrorResponseDto,
  })
  async place(
    @CurrentUser() user: AuthUser,
    @Body() dto: PlaceOrderDto,
  ): Promise<PlaceOrderResponseDto> {
    const { order, position } = await this.ordersService.placeMarketOrder(
      user.id,
      dto,
    );
    return {
      order: OrderDto.from(order),
      position: position && PositionDto.from(position),
    };
  }
}
