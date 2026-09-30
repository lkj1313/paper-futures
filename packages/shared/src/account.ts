import type {
  OrderSide,
  OrderStatus,
  OrderType,
  PositionSide,
} from './trading.js';

// 내 계정 데이터의 모양. REST 응답과 실시간 이벤트가 같은 모양을 쓴다.
// 금액, 수량, 가격은 소수 오차를 피하려고 문자열이다.

export interface AccountOrder {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  status: OrderStatus;
  qty: string;
  /** 지정가. 시장가와 청산 주문은 null */
  price: string | null;
  leverage: number;
  reduceOnly: boolean;
  /** 대기 중에 묶어 둔 금액 (상태가 NEW일 때만 주문 가능 금액에서 빠진다) */
  reservedMargin: string;
  /** 평균 체결가. 아직 체결되지 않았으면 null */
  avgFillPrice: string | null;
  fee: string;
  realizedPnl: string;
  /** ISO 8601 시각 */
  createdAt: string;
  updatedAt: string;
}

export interface AccountPosition {
  symbol: string;
  side: PositionSide;
  qty: string;
  entryPrice: string;
  leverage: number;
  isolatedMargin: string;
  liquidationPrice: string;
}

export interface AccountWallet {
  asset: string;
  balance: string;
  usedMargin: string;
  openOrderMargin: string;
  availableBalance: string;
}
