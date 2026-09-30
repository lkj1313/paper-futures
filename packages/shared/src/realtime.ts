import type {
  MarketSymbol,
  MarketTrade,
  MarkPriceInfo,
  OrderBookDepth,
} from './market.js';

/** socket.io 연결 경로. api 서버와 같은 포트를 쓴다 */
export const REALTIME_PATH = '/api/socket.io';

/** 0.1초 동안 모인 체결 (오래된 것부터) */
export interface TradesEvent {
  symbol: MarketSymbol;
  trades: MarketTrade[];
}

export interface MarkEvent extends MarkPriceInfo {
  symbol: MarketSymbol;
}

export interface DepthEvent extends OrderBookDepth {
  symbol: MarketSymbol;
}

/** 구독 요청 결과 */
export type SubscribeAck = { ok: true } | { ok: false; message: string };

/** 서버 → 클라이언트 */
export interface ServerToClientEvents {
  trades: (event: TradesEvent) => void;
  mark: (event: MarkEvent) => void;
  depth: (event: DepthEvent) => void;
}

/** 클라이언트 → 서버. 결과는 ack(응답 콜백)로 받는다 */
export interface ClientToServerEvents {
  /** 종목 시세 방에 들어간다. 들어가자마자 저장된 최신 시세를 한 번 받는다 */
  subscribe: (symbol: string, ack: (result: SubscribeAck) => void) => void;
  unsubscribe: (symbol: string, ack: (result: SubscribeAck) => void) => void;
}
