import { ApiProperty } from '@nestjs/swagger';
import type { Order, Position } from '../../generated/prisma/client.js';
import {
  OrderSide,
  OrderStatus,
  OrderType,
  PositionSide,
} from '../../generated/prisma/enums.js';

// 금액, 수량, 가격은 모두 문자열로 준다

export class OrderDto {
  id: string;
  symbol: string;

  @ApiProperty({ enum: OrderSide })
  side: OrderSide;

  @ApiProperty({ enum: OrderType })
  type: OrderType;

  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus;

  qty: string;
  leverage: number;
  /** 평균 체결가 */
  avgFillPrice: string;
  fee: string;
  /** 포지션을 줄였을 때 확정된 손익 */
  realizedPnl: string;
  createdAt: Date;

  static from(order: Order): OrderDto {
    return {
      id: order.id,
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      status: order.status,
      qty: order.qty.toString(),
      leverage: order.leverage,
      avgFillPrice: order.avgFillPrice.toString(),
      fee: order.fee.toString(),
      realizedPnl: order.realizedPnl.toString(),
      createdAt: order.createdAt,
    };
  }
}

export class PositionDto {
  symbol: string;

  @ApiProperty({ enum: PositionSide })
  side: PositionSide;

  qty: string;
  /** 평균 진입가 */
  entryPrice: string;
  leverage: number;
  /** 이 포지션에 묶인 증거금 */
  isolatedMargin: string;

  static from(position: Position): PositionDto {
    return {
      symbol: position.symbol,
      side: position.side,
      qty: position.qty.toString(),
      entryPrice: position.entryPrice.toString(),
      leverage: position.leverage,
      isolatedMargin: position.isolatedMargin.toString(),
    };
  }
}

export class PlaceOrderResponseDto {
  order: OrderDto;
  /** 주문 체결 후의 포지션 */
  position: PositionDto;
}
