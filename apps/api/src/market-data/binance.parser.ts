import {
  type MarketSymbol,
  type MarketTrade,
  type MarkPriceInfo,
  type OrderBookDepth,
  SYMBOLS,
} from '@paper-futures/shared';
import { z } from 'zod';

// 가격, 수량은 숫자 모양의 문자열이어야 한다 (펀딩비율은 음수 가능)
const decimal = z.string().regex(/^\d+(\.\d+)?$/);
const signedDecimal = z.string().regex(/^-?\d+(\.\d+)?$/);
const symbol = z.enum(SYMBOLS);
const level = z.tuple([decimal, decimal]);

// Binance 원본 메시지. 필드 이름은 Binance 문서 기준 (한 글자 약어)
const aggTrade = z.object({
  e: z.literal('aggTrade'),
  s: symbol,
  p: decimal, // 체결가
  q: decimal, // 수량
  T: z.number(), // 체결 시각
});

const markPriceUpdate = z.object({
  e: z.literal('markPriceUpdate'),
  E: z.number(), // 이벤트 시각
  s: symbol,
  p: decimal, // 마크가격
  i: decimal, // 인덱스가격
  r: signedDecimal, // 펀딩비율
  T: z.number(), // 다음 펀딩 시각
});

const depthUpdate = z.object({
  e: z.literal('depthUpdate'),
  E: z.number(),
  s: symbol,
  b: z.array(level), // 매수 호가
  a: z.array(level), // 매도 호가
});

// 여러 스트림을 한 연결로 받으면 { stream, data } 형태로 감싸서 온다
const combinedMessage = z.object({
  stream: z.string(),
  data: z.discriminatedUnion('e', [aggTrade, markPriceUpdate, depthUpdate]),
});

export type MarketEvent =
  | { symbol: MarketSymbol; kind: 'trade'; data: MarketTrade }
  | { symbol: MarketSymbol; kind: 'mark'; data: MarkPriceInfo }
  | { symbol: MarketSymbol; kind: 'depth'; data: OrderBookDepth };

/**
 * Binance 메시지를 검증하고 알아보기 쉬운 이름으로 바꾼다.
 * 형식이 다르거나 다루지 않는 종목이면 null.
 */
export function parseBinanceMessage(
  raw: string,
  receivedAt = Date.now(),
): MarketEvent | null {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }

  const parsed = combinedMessage.safeParse(json);
  if (!parsed.success) return null;
  const data = parsed.data.data;

  switch (data.e) {
    case 'aggTrade':
      return {
        symbol: data.s,
        kind: 'trade',
        data: { price: data.p, qty: data.q, time: data.T, receivedAt },
      };
    case 'markPriceUpdate':
      return {
        symbol: data.s,
        kind: 'mark',
        data: {
          markPrice: data.p,
          indexPrice: data.i,
          fundingRate: data.r,
          nextFundingTime: data.T,
          time: data.E,
          receivedAt,
        },
      };
    case 'depthUpdate':
      return {
        symbol: data.s,
        kind: 'depth',
        data: { bids: data.b, asks: data.a, time: data.E, receivedAt },
      };
  }
}

/** 경로(/public, /market)별로 어떤 스트림을 구독할지 */
export const STREAMS_BY_ROUTE: Record<
  'public' | 'market',
  (symbol: string) => string[]
> = {
  // 고빈도 데이터: 상위 20단계 호가 (100ms마다)
  public: (s) => [`${s}@depth20@100ms`],
  // 일반 데이터: 체결, 마크가격 (1초마다)
  market: (s) => [`${s}@aggTrade`, `${s}@markPrice@1s`],
};

export function buildStreamUrl(
  baseUrl: string,
  route: 'public' | 'market',
): string {
  const streams = SYMBOLS.flatMap((s) =>
    STREAMS_BY_ROUTE[route](s.toLowerCase()),
  );
  return `${baseUrl}/${route}/stream?streams=${streams.join('/')}`;
}
