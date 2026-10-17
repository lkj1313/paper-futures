import type {
  ClientToServerEvents,
  MarketSymbol,
  ServerToClientEvents,
} from '@paper-futures/shared';
import type { Socket } from 'socket.io-client';
import { refreshAccessToken } from '@/shared/api/refresh';
import { useTokenStore } from '@/shared/api/token-store';

export type RealtimeSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const noop = () => undefined;

export function createRealtime(
  socket: RealtimeSocket,
  deps: { refresh: () => Promise<string> } = { refresh: refreshAccessToken },
) {
  const subscriptions = new Map<MarketSymbol, number>();
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
    else if (subscriptions.size > 0) socket.connect();
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

  return { subscribeMarket, unsubscribeMarket, dispose };
}
