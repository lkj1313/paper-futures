/** 주문 방향: 사기 / 팔기 */
export const OrderSide = { BUY: 'BUY', SELL: 'SELL' } as const;
export type OrderSide = (typeof OrderSide)[keyof typeof OrderSide];

/** 포지션 방향: 롱(가격 상승에 베팅) / 숏(가격 하락에 베팅) */
export const PositionSide = { LONG: 'LONG', SHORT: 'SHORT' } as const;
export type PositionSide = (typeof PositionSide)[keyof typeof PositionSide];
