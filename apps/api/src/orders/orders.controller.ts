import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { AppException } from '../common/app.exception.js';
import { ErrorResponseDto } from '../common/error-response.dto.js';
import {
  OrderDto,
  PlaceOrderResponseDto,
  PositionDto,
} from './dto/order-response.dto.js';
import { ListOrdersQueryDto, OrderPageDto } from './dto/list-orders.dto.js';
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

  @Get()
  @ApiOperation({ summary: '내 주문 내역, 최신순' })
  @ApiOkResponse({ type: OrderPageDto })
  async list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListOrdersQueryDto,
  ): Promise<OrderPageDto> {
    const { items, nextCursor } = await this.ordersService.list(user.id, query);
    return { items: items.map((order) => OrderDto.from(order)), nextCursor };
  }

  @Post()
  @ApiOperation({
    summary: '주문 (시장가, 지정가)',
    description: [
      '시장가: 호가 기준으로 즉시 체결한다. 포지션과 같은 방향이면 열기/늘리기, 반대 방향이면 줄이기/닫기.',
      '지정가: 대기(NEW)로 저장하고 증거금 + 수수료를 묶어 둔다 (reduceOnly는 묶지 않는다).',
    ].join('\n\n'),
  })
  @ApiCreatedResponse({ type: PlaceOrderResponseDto })
  @ApiBadRequestResponse({
    description:
      'VALIDATION_ERROR, INVALID_ORDER_QTY, INVALID_ORDER_PRICE, INVALID_LEVERAGE, INSUFFICIENT_MARGIN, INSUFFICIENT_LIQUIDITY, POSITION_FLIP_NOT_SUPPORTED, REDUCE_ONLY_REJECTED',
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
    const { order, position } = await this.ordersService.place(user.id, dto);
    return {
      order: OrderDto.from(order),
      position: position && PositionDto.from(position),
    };
  }

  @Delete(':id')
  @ApiOperation({
    summary: '대기 중인 지정가 주문 취소',
    description: '상태가 CANCELED로 바뀌고 묶여 있던 금액이 풀린다.',
  })
  @ApiOkResponse({ type: OrderDto })
  @ApiBadRequestResponse({
    description: 'id 형식이 잘못됨 (VALIDATION_ERROR)',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: '없거나 내 주문이 아님 (NOT_FOUND)',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: '이미 체결되거나 취소된 주문 (ORDER_NOT_OPEN)',
    type: ErrorResponseDto,
  })
  async cancel(
    @CurrentUser() user: AuthUser,
    @Param(
      'id',
      new ParseUUIDPipe({
        exceptionFactory: () =>
          new AppException('VALIDATION_ERROR', {
            message: '주문 id 형식이 올바르지 않습니다.',
          }),
      }),
    )
    id: string,
  ): Promise<OrderDto> {
    return OrderDto.from(await this.ordersService.cancel(user.id, id));
  }
}
