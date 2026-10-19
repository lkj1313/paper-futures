import type {
  CandleTarget,
  ClientToServerEvents,
  MarketSymbol,
  ServerToClientEvents,
} from '@paper-futures/shared';
import type { Socket } from 'socket.io-client';
import { refreshAccessToken } from '@/shared/api/refresh';
import { useTokenStore } from '@/shared/api/token-store';

export type RealtimeSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const noop = () => undefined;

const candleKeyOf = ({ symbol, interval }: CandleTarget) =>
  `${symbol}:${interval}`;

export function createRealtime(
  socket: RealtimeSocket,
  deps: { refresh: () => Promise<string> } = { refresh: refreshAccessToken },
) {
  const subscriptions = new Map<MarketSymbol, number>();
  const candleSubscriptions = new Map<
    string,
    { target: CandleTarget; count: number }
  >();
  let tokenAtConnect: string | null = null;
  let retriedAfterAuthError = false;

  socket.auth = (cb) => {
    tokenAtConnect = useTokenStore.getState().accessToken;
    cb(tokenAtConnect ? { token: tokenAtConnect } : {});
  };

  socket.on('connect', () => {
    retriedAfterAuthError = false;
    for (const symbol of subscriptions.keys()) {
      socket.emit('subscribe', symbol, noop);
    }
    for (const { target } of candleSubscriptions.values()) {
      socket.emit('subscribeCandles', target, noop);
    }
  });

  socket.on('sessionExpired', () => {
    void renewAndReconnect();
  });

  socket.on('connect_error', (error) => {
    if (error.message !== 'TOKEN_EXPIRED' || retriedAfterAuthError) return;
    retriedAfterAuthError = true;
    void renewAndReconnect();
  });

  const dispose = useTokenStore.subscribe((state, prev) => {
    const loggedIn = state.accessToken !== null;
    if (loggedIn === (prev.accessToken !== null)) return;
    if (socket.active) socket.disconnect().connect();
    else if (subscriptions.size > 0 || candleSubscriptions.size > 0) {
      socket.connect();
    }
  });

  async function renewAndReconnect() {
    const { accessToken } = useTokenStore.getState();
    if (accessToken !== null && accessToken === tokenAtConnect) {
      await deps.refresh().catch(noop);
    }
    socket.connect();
  }

  function subscribeMarket(symbol: MarketSymbol) {
    const count = subscriptions.get(symbol) ?? 0;
    subscriptions.set(symbol, count + 1);
    if (count > 0) return;
    if (socket.connected) socket.emit('subscribe', symbol, noop);
    else if (!socket.active) socket.connect();
  }

  function unsubscribeMarket(symbol: MarketSymbol) {
    const count = subscriptions.get(symbol) ?? 0;
    if (count > 1) {
      subscriptions.set(symbol, count - 1);
      return;
    }
    subscriptions.delete(symbol);
    if (count === 1 && socket.connected) {
      socket.emit('unsubscribe', symbol, noop);
    }
  }

  function subscribeCandles({ symbol, interval }: CandleTarget) {
    const target = { symbol, interval };
    const key = candleKeyOf(target);
    const count = candleSubscriptions.get(key)?.count ?? 0;
    candleSubscriptions.set(key, { target, count: count + 1 });
    if (count > 0) return;
    if (socket.connected) socket.emit('subscribeCandles', target, noop);
    else if (!socket.active) socket.connect();
  }

  function unsubscribeCandles(target: CandleTarget) {
    const key = candleKeyOf(target);
    const subscription = candleSubscriptions.get(key);
    if (!subscription) return;
    if (subscription.count > 1) {
      subscription.count -= 1;
      return;
    }
    candleSubscriptions.delete(key);
    if (socket.connected) {
      socket.emit('unsubscribeCandles', subscription.target, noop);
    }
  }

  return {
    subscribeMarket,
    unsubscribeMarket,
    subscribeCandles,
    unsubscribeCandles,
    dispose,
  };
}
