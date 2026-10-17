import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTokenStore } from '@/shared/api/token-store';
import { createRealtime, type RealtimeSocket } from './realtime';

type Handler = (...args: unknown[]) => void;

class FakeSocket {
  connected = false;
  active = false;
  auth: unknown;
  private handlers = new Map<string, Handler[]>();

  on(event: string, handler: Handler) {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]);
    return this;
  }

  emit = vi.fn();

  connect = vi.fn(() => {
    this.active = true;
    return this;
  });

  disconnect = vi.fn(() => {
    this.connected = false;
    this.active = false;
    return this;
  });

  fire(event: string, ...args: unknown[]) {
    for (const handler of this.handlers.get(event) ?? []) handler(...args);
  }

  serverAccepts() {
    this.connected = true;
    this.active = true;
    this.fire('connect');
  }

  serverDrops() {
    this.connected = false;
    this.active = false;
  }

  sentAuth() {
    let data: unknown;
    (this.auth as (cb: (value: unknown) => void) => void)((value) => {
      data = value;
    });
    return data;
  }

  emitted(event: string) {
    return this.emit.mock.calls
      .filter(([name]) => name === event)
      .map(([, symbol]) => symbol);
  }
}

const disposers: (() => void)[] = [];

function setup() {
  const socket = new FakeSocket();
  const refresh = vi.fn(async () => {
    useTokenStore.getState().setAccessToken('refreshed');
    return 'refreshed';
  });
  const realtime = createRealtime(socket as unknown as RealtimeSocket, {
    refresh,
  });
  disposers.push(realtime.dispose);
  return { socket, refresh, realtime };
}

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose();
});

describe('종목 구독', () => {
  it('처음 구독하면 연결하고, 연결되면 구독 요청을 보낸다', () => {
    const { socket, realtime } = setup();

    realtime.subscribeMarket('BTCUSDT');

    expect(socket.connect).toHaveBeenCalledOnce();
    expect(socket.emitted('subscribe')).toEqual([]);

    socket.serverAccepts();

    expect(socket.emitted('subscribe')).toEqual(['BTCUSDT']);
  });

  it('같은 종목을 두 번 구독해도 요청은 한 번, 마지막이 떠날 때만 나간다', () => {
    const { socket, realtime } = setup();
    socket.serverAccepts();

    realtime.subscribeMarket('BTCUSDT');
    realtime.subscribeMarket('BTCUSDT');
    expect(socket.emitted('subscribe')).toEqual(['BTCUSDT']);

    realtime.unsubscribeMarket('BTCUSDT');
    expect(socket.emitted('unsubscribe')).toEqual([]);

    realtime.unsubscribeMarket('BTCUSDT');
    expect(socket.emitted('unsubscribe')).toEqual(['BTCUSDT']);
  });

  it('다시 연결되면 구독 중인 종목에 다시 들어간다', () => {
    const { socket, realtime } = setup();
    realtime.subscribeMarket('BTCUSDT');
    realtime.subscribeMarket('ETHUSDT');
    socket.serverAccepts();
    socket.emit.mockClear();

    socket.serverDrops();
    socket.serverAccepts();

    expect(socket.emitted('subscribe')).toEqual(['BTCUSDT', 'ETHUSDT']);
  });
});

describe('토큰과 다시 연결', () => {
  it('연결할 때마다 그 순간의 토큰을 보낸다', () => {
    const { socket } = setup();

    expect(socket.sentAuth()).toEqual({});
    useTokenStore.getState().setAccessToken('token-1');
    expect(socket.sentAuth()).toEqual({ token: 'token-1' });
  });

  it('로그인하거나 로그아웃하면 다시 연결하고, 토큰만 바뀌면 그대로 둔다', () => {
    const { socket, realtime } = setup();
    realtime.subscribeMarket('BTCUSDT');
    socket.serverAccepts();
    socket.connect.mockClear();

    useTokenStore.getState().setAccessToken('token-1');
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
    expect(socket.connect).toHaveBeenCalledTimes(1);

    useTokenStore.getState().setAccessToken('token-2');
    expect(socket.disconnect).toHaveBeenCalledTimes(1);

    useTokenStore.getState().clearAccessToken();
    expect(socket.disconnect).toHaveBeenCalledTimes(2);
    expect(socket.connect).toHaveBeenCalledTimes(2);
  });

  it('구독 중인데 연결이 멈춰 있으면 로그인할 때 다시 연결한다', () => {
    const { socket, realtime } = setup();
    realtime.subscribeMarket('BTCUSDT');
    socket.serverDrops();
    socket.connect.mockClear();

    useTokenStore.getState().setAccessToken('token-1');

    expect(socket.connect).toHaveBeenCalledOnce();
  });

  it('sessionExpired: 연결할 때 쓴 토큰 그대로면 갱신한 뒤 다시 연결한다', async () => {
    const { socket, refresh, realtime } = setup();
    useTokenStore.getState().setAccessToken('token-1');
    realtime.subscribeMarket('BTCUSDT');
    socket.sentAuth();
    socket.serverAccepts();
    socket.connect.mockClear();

    socket.serverDrops();
    socket.fire('sessionExpired');

    await vi.waitFor(() => expect(socket.connect).toHaveBeenCalledOnce());
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('sessionExpired: 다른 요청이 이미 갱신했으면 refresh 없이 다시 연결한다', async () => {
    const { socket, refresh, realtime } = setup();
    useTokenStore.getState().setAccessToken('token-1');
    realtime.subscribeMarket('BTCUSDT');
    socket.sentAuth();
    socket.serverAccepts();
    useTokenStore.getState().setAccessToken('token-2');
    socket.connect.mockClear();

    socket.serverDrops();
    socket.fire('sessionExpired');

    await vi.waitFor(() => expect(socket.connect).toHaveBeenCalledOnce());
    expect(refresh).not.toHaveBeenCalled();
  });

  it('TOKEN_EXPIRED로 거절되면 갱신해서 한 번만 다시 시도한다', async () => {
    const { socket, refresh, realtime } = setup();
    useTokenStore.getState().setAccessToken('token-1');
    realtime.subscribeMarket('BTCUSDT');
    socket.sentAuth();
    socket.connect.mockClear();

    socket.serverDrops();
    socket.fire('connect_error', new Error('TOKEN_EXPIRED'));
    await vi.waitFor(() => expect(socket.connect).toHaveBeenCalledOnce());

    socket.sentAuth();
    socket.serverDrops();
    socket.fire('connect_error', new Error('TOKEN_EXPIRED'));
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(refresh).toHaveBeenCalledOnce();
    expect(socket.connect).toHaveBeenCalledOnce();
  });
});
