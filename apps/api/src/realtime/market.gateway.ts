import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  type ClientToServerEvents,
  type DepthEvent,
  isMarketSymbol,
  type MarkEvent,
  type MarketSymbol,
  type ServerToClientEvents,
  type SubscribeAck,
  type TradesEvent,
} from '@paper-futures/shared';
import type { Server, Socket } from 'socket.io';
import { Public } from '../auth/public.decorator.js';
import { MarketService } from '../market/market.service.js';

type RealtimeServer = Server<ClientToServerEvents, ServerToClientEvents>;
type RealtimeSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/** 종목 시세 방 이름. 예: market:BTCUSDT */
const marketRoom = (symbol: MarketSymbol) => `market:${symbol}`;

const UNKNOWN_SYMBOL: SubscribeAck = {
  ok: false,
  message: '지원하지 않는 종목입니다.',
};

/**
 * 웹 브라우저와의 실시간 연결. 연결은 종목 시세 방에 들어가고 나가며,
 * 방에 있는 연결에만 그 종목 시세를 보낸다 (경로와 CORS는 SocketIoAdapter에서 정한다)
 */
// 시세는 로그인 없이 볼 수 있다 (전역 로그인 가드가 WebSocket 메시지에도 적용된다)
@Public()
@WebSocketGateway()
export class MarketGateway {
  @WebSocketServer()
  private readonly server: RealtimeServer;

  constructor(private readonly market: MarketService) {}

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
}
