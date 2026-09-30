import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  type OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  type AccountOrder,
  type AccountPosition,
  type AccountWallet,
  type ClientToServerEvents,
  type DepthEvent,
  isMarketSymbol,
  type MarkEvent,
  type MarketSymbol,
  type RealtimeAuth,
  type RealtimeAuthError,
  type ServerToClientEvents,
  type SubscribeAck,
  type TradesEvent,
} from '@paper-futures/shared';
import type { DefaultEventsMap, Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../auth/access-token.js';
import { Public } from '../auth/public.decorator.js';
import { AppException } from '../common/app.exception.js';
import { MarketService } from '../market/market.service.js';

/** 연결마다 서버가 들고 있는 정보. 토큰 없이 연결하면 비어 있다 */
interface SocketData {
  userId?: string;
  /** 토큰 만료 시각 (ms) */
  expiresAt?: number;
}

type RealtimeServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  DefaultEventsMap,
  SocketData
>;
type RealtimeSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  DefaultEventsMap,
  SocketData
>;

/** 종목 시세 방 이름. 예: market:BTCUSDT */
const marketRoom = (symbol: MarketSymbol) => `market:${symbol}`;
/** 사용자 방 이름. 한 사용자가 여러 탭으로 연결해도 모두 받는다 */
const userRoom = (userId: string) => `user:${userId}`;

const UNKNOWN_SYMBOL: SubscribeAck = {
  ok: false,
  message: '지원하지 않는 종목입니다.',
};

/**
 * 웹 브라우저와의 실시간 연결 (경로와 CORS는 SocketIoAdapter에서 정한다)
 * - 시세: 연결이 종목 방에 들어가고 나가며, 방에 있는 연결에만 그 종목 시세를 보낸다
 * - 내 계정: 토큰을 내고 연결하면 사용자 방에 들어가서 내 주문, 포지션, 지갑 변화를 받는다
 */
// 메시지(구독)는 로그인 없이 쓸 수 있다. 로그인은 연결할 때 따로 확인한다
// (전역 로그인 가드가 WebSocket 메시지에도 적용되기 때문에 @Public이 필요하다)
@Public()
@WebSocketGateway()
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  private readonly server: RealtimeServer;

  constructor(
    private readonly market: MarketService,
    private readonly jwt: JwtService,
  ) {}

  /** 연결할 때 토큰을 확인한다. 토큰이 없으면 시세만 받는 연결, 틀리거나 만료됐으면 거부한다 */
  afterInit(server: RealtimeServer) {
    server.use((socket, next) => {
      const { token } = (socket.handshake.auth ?? {}) as RealtimeAuth;
      if (!token) return next();

      verifyAccessToken(this.jwt, token)
        .then(({ sub, exp }) => {
          socket.data.userId = sub;
          socket.data.expiresAt = exp * 1000;
          next();
        })
        .catch((error: unknown) => {
          const code: RealtimeAuthError =
            error instanceof AppException && error.code === 'TOKEN_EXPIRED'
              ? 'TOKEN_EXPIRED'
              : 'UNAUTHORIZED';
          // 클라이언트는 connect_error의 message로 받는다
          next(new Error(code));
        });
    });
  }

  /** 로그인한 연결은 사용자 방에 넣고, 토큰이 만료되는 시각에 끊는다 */
  async handleConnection(socket: RealtimeSocket) {
    const { userId, expiresAt } = socket.data;
    if (!userId || !expiresAt) return;

    await socket.join(userRoom(userId));
    // 만료된 토큰으로 계속 받지 않도록 끊는다 (웹이 토큰을 갱신해서 다시 연결한다)
    const timer = setTimeout(() => {
      socket.emit('sessionExpired');
      socket.disconnect(true);
    }, expiresAt - Date.now());
    socket.once('disconnect', () => clearTimeout(timer));
  }

  /** 종목 시세 방에 들어간다. 다음 방송을 기다리지 않도록 저장된 최신 시세를 바로 보낸다 */
  @SubscribeMessage('subscribe')
  async subscribe(
    @ConnectedSocket() socket: RealtimeSocket,
    @MessageBody() symbol: unknown,
  ): Promise<SubscribeAck> {
    if (!isMarketSymbol(symbol)) return UNKNOWN_SYMBOL;
    await socket.join(marketRoom(symbol));

    const { trade, mark, depth } = await this.market.getSnapshot(symbol);
    if (trade) socket.emit('trades', { symbol, trades: [trade] });
    if (mark) socket.emit('mark', { ...mark, symbol });
    if (depth) socket.emit('depth', { ...depth, symbol });
    return { ok: true };
  }

  @SubscribeMessage('unsubscribe')
  async unsubscribe(
    @ConnectedSocket() socket: RealtimeSocket,
    @MessageBody() symbol: unknown,
  ): Promise<SubscribeAck> {
    if (!isMarketSymbol(symbol)) return UNKNOWN_SYMBOL;
    await socket.leave(marketRoom(symbol));
    return { ok: true };
  }

  sendTrades(event: TradesEvent) {
    this.server.to(marketRoom(event.symbol)).emit('trades', event);
  }

  sendMark(event: MarkEvent) {
    this.server.to(marketRoom(event.symbol)).emit('mark', event);
  }

  sendDepth(event: DepthEvent) {
    this.server.to(marketRoom(event.symbol)).emit('depth', event);
  }

  /** 이 사용자가 지금 연결돼 있는지 (없으면 보낼 필요가 없다) */
  isOnline(userId: string) {
    return (
      (this.server.sockets.adapter.rooms.get(userRoom(userId))?.size ?? 0) > 0
    );
  }

  sendAccount(
    userId: string,
    account: {
      orders: AccountOrder[];
      positions: AccountPosition[];
      wallet: AccountWallet;
    },
  ) {
    const room = this.server.to(userRoom(userId));
    if (account.orders.length > 0)
      room.emit('orders', { orders: account.orders });
    room.emit('positions', { positions: account.positions });
    room.emit('wallet', account.wallet);
  }
}
