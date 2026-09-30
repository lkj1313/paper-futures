/** 주문 방향: 사기 / 팔기 */
export const OrderSide = { BUY: 'BUY', SELL: 'SELL' } as const;
export type OrderSide = (typeof OrderSide)[keyof typeof OrderSide];

/** 포지션 방향: 롱(가격 상승에 베팅) / 숏(가격 하락에 베팅) */
export const PositionSide = { LONG: 'LONG', SHORT: 'SHORT' } as const;
export type PositionSide = (typeof PositionSide)[keyof typeof PositionSide];

/** 주문 유형: 시장가 / 지정가 / 청산 (청산은 시스템만 낸다) */
export const OrderType = {
  MARKET: 'MARKET',
  LIMIT: 'LIMIT',
  LIQUIDATION: 'LIQUIDATION',
} as const;
export type OrderType = (typeof OrderType)[keyof typeof OrderType];

/** 주문 상태: 대기 / 체결 / 사용자 취소 / 시스템 취소 */
export const OrderStatus = {
  NEW: 'NEW',
  FILLED: 'FILLED',
  CANCELED: 'CANCELED',
  EXPIRED: 'EXPIRED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];
