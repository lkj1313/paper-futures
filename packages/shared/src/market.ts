export const SYMBOLS = ['BTCUSDT', 'ETHUSDT'] as const;
export type MarketSymbol = (typeof SYMBOLS)[number];

/** 지원하는 종목인지 */
export const isMarketSymbol = (value: unknown): value is MarketSymbol =>
  typeof value === 'string' && (SYMBOLS as readonly string[]).includes(value);

/** market-data 프로세스가 Redis에 저장하고 방송하는 시세 종류 */
export const MARKET_DATA_KINDS = ['trade', 'mark', 'depth'] as const;
export type MarketDataKind = (typeof MARKET_DATA_KINDS)[number];

/** Redis 키이자 Pub/Sub 채널 이름. 예: market:BTCUSDT:mark */
export const marketKey = (symbol: MarketSymbol, kind: MarketDataKind) =>
  `market:${symbol}:${kind}`;

// 가격과 수량은 모두 Binance가 보내준 그대로 문자열이다.
// time은 Binance 기준 시각, receivedAt은 우리가 받은 시각 (둘 다 ms).

/** 가장 최근 체결 */
export interface MarketTrade {
  price: string;
  qty: string;
  time: number;
  receivedAt: number;
}

/** 마크가격과 펀딩 정보 */
export interface MarkPriceInfo {
  markPrice: string;
  indexPrice: string;
  fundingRate: string;
  nextFundingTime: number;
  time: number;
  receivedAt: number;
}

/** [가격, 수량] */
export type PriceLevel = [price: string, qty: string];

/** 상위 20단계 호가 */
export interface OrderBookDepth {
  bids: PriceLevel[];
  asks: PriceLevel[];
  time: number;
  receivedAt: number;
}

/** 받은 지 이 시간이 지난 시세는 오래된(stale) 것으로 본다 */
export const MARKET_DATA_STALE_MS = 5_000;

/**
 * 시세가 오래됐는지 판단한다. 기준은 Binance 시각이 아니라 우리가 받은 시각(receivedAt)이다.
 * 한 번도 받은 적 없으면(undefined) 오래된 것으로 본다.
 */
export function isStale(
  receivedAt: number | undefined,
  now: number = Date.now(),
): boolean {
  return receivedAt === undefined || now - receivedAt > MARKET_DATA_STALE_MS;
}
