import type {
  AccountOrder,
  AccountPosition,
  AccountWallet,
} from './account.js';
import type { ErrorCode } from './errors.js';
import type {
  MarketSymbol,
  MarketTrade,
  MarkPriceInfo,
  OrderBookDepth,
} from './market.js';

/** socket.io 연결 경로. api 서버와 같은 포트를 쓴다 */
export const REALTIME_PATH = '/api/socket.io';

/**
 * 연결할 때 보내는 인증 정보 (socket.io 옵션 auth).
 * 토큰이 없으면 시세만 받는 연결, 있으면 내 계정 이벤트도 받는다.
 * 토큰이 틀리면 연결이 거부되고 connect_error의 message로 에러 코드가 온다
 */
export interface RealtimeAuth {
  token?: string;
}

/** 연결 거부 사유 (connect_error의 message) */
export type RealtimeAuthError = Extract<
  ErrorCode,
  'UNAUTHORIZED' | 'TOKEN_EXPIRED'
>;

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

  // 아래는 로그인한 연결만 받는다
  /** 내 주문이 바뀜 (넣음, 체결, 취소, 시스템 취소, 청산) */
  orders: (event: { orders: AccountOrder[] }) => void;
  /** 지금 열린 내 포지션 전체. 바뀔 때마다 목록을 통째로 보낸다 */
  positions: (event: { positions: AccountPosition[] }) => void;
  wallet: (event: AccountWallet) => void;
  /** 토큰이 만료돼서 연결을 끊는다. 토큰을 갱신해서 다시 연결하면 된다 */
  sessionExpired: () => void;
}

/** 클라이언트 → 서버. 결과는 ack(응답 콜백)로 받는다 */
export interface ClientToServerEvents {
  /** 종목 시세 방에 들어간다. 들어가자마자 저장된 최신 시세를 한 번 받는다 */
  subscribe: (symbol: string, ack: (result: SubscribeAck) => void) => void;
  unsubscribe: (symbol: string, ack: (result: SubscribeAck) => void) => void;
}
