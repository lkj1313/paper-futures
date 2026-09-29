import type { MarketSymbol } from './market.js';

export interface MarketSpec {
  /** 가격이 움직이는 최소 단위 (호가 단위) */
  tickSize: string;
  /** 수량의 최소 단위 */
  stepSize: string;
  /** 최소 주문 금액 (명목가치, USDT) */
  minNotional: string;
  maxLeverage: number;
  /** 유지증거금률. 남은 증거금이 명목가치의 이 비율 밑으로 떨어지면 청산 */
  maintenanceMarginRate: string;
}

/**
 * 종목별 거래 규칙. Binance 선물 값을 기준으로 한다.
 * 유지증거금률은 원래 포지션 크기에 따라 구간별로 오르지만, 모의거래소라 한 가지 비율로 단순화했다.
 */
export const MARKET_SPECS: Record<MarketSymbol, MarketSpec> = {
  BTCUSDT: {
    tickSize: '0.1',
    stepSize: '0.001',
    minNotional: '100',
    maxLeverage: 125,
    maintenanceMarginRate: '0.004',
  },
  ETHUSDT: {
    tickSize: '0.01',
    stepSize: '0.001',
    minNotional: '20',
    maxLeverage: 100,
    maintenanceMarginRate: '0.005',
  },
};

/** 거래 수수료율. 테이커: 바로 체결되는 주문, 메이커: 호가창에 걸어두는 주문 */
export const FEE_RATES = {
  taker: '0.0005',
  maker: '0.0002',
} as const;
