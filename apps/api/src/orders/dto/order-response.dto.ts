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

  @ApiProperty({
    type: String,
    nullable: true,
    description: '지정가. 시장가와 청산 주문은 null',
  })
  price: string | null;

  leverage: number;
  reduceOnly: boolean;
  /** 대기 중에 묶어 둔 금액 (증거금 + 수수료). 상태가 NEW일 때만 주문 가능 금액에서 빠진다 */
  reservedMargin: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: '평균 체결가. 아직 체결되지 않았으면 null',
  })
  avgFillPrice: string | null;

  fee: string;
  /** 포지션을 줄였을 때 확정된 손익 */
  realizedPnl: string;
  createdAt: Date;
  /** 마지막으로 상태가 바뀐 시각 (체결, 취소) */
  updatedAt: Date;

  static from(order: Order): OrderDto {
    return {
      id: order.id,
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      status: order.status,
      qty: order.qty.toString(),
      price: order.price?.toString() ?? null,
      leverage: order.leverage,
      reduceOnly: order.reduceOnly,
      reservedMargin: order.reservedMargin.toString(),
      avgFillPrice: order.avgFillPrice?.toString() ?? null,
      fee: order.fee.toString(),
      realizedPnl: order.realizedPnl.toString(),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
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
  /** 격리 마진 청산가 (수수료 미반영). 롱이 절대 청산되지 않으면 0 */
  liquidationPrice: string;

  static from(position: Position): PositionDto {
    return {
      symbol: position.symbol,
      side: position.side,
      qty: position.qty.toString(),
      entryPrice: position.entryPrice.toString(),
      leverage: position.leverage,
      isolatedMargin: position.isolatedMargin.toString(),
      liquidationPrice: position.liquidationPrice.toString(),
    };
  }
}

export class PlaceOrderResponseDto {
  order: OrderDto;

  /** 주문 후의 포지션. 포지션이 없거나 닫았으면 null (대기 주문은 포지션을 바꾸지 않는다) */
  @ApiProperty({ type: PositionDto, nullable: true })
  position: PositionDto | null;
}
