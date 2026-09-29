import type { Logger } from '@nestjs/common';
import { BinanceStream, reconnectDelay } from './binance-stream.js';

// 실제 네트워크 대신 쓰는 가짜 WebSocket. 테스트에서 이벤트를 직접 일으킨다
class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  closed = false;

  constructor(readonly url: string) {
    FakeWebSocket.instances.push(this);
  }

  close() {
    this.closed = true;
  }
}

const logger = { log: vi.fn(), warn: vi.fn() } as unknown as Logger;

describe('reconnectDelay', () => {
  it('1초부터 두 배씩 늘리고 30초에서 멈춘다', () => {
    expect([0, 1, 2, 3, 4, 5, 10].map(reconnectDelay)).toEqual([
      1000, 2000, 4000, 8000, 16000, 30000, 30000,
    ]);
  });
});

describe('BinanceStream', () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', FakeWebSocket);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const createStream = (onMessage = vi.fn()) =>
    new BinanceStream({
      name: 'test',
      url: 'wss://example',
      logger,
      onMessage,
      staleAfterMs: 10_000,
    });

  it('받은 메시지를 onMessage로 넘긴다', () => {
    const onMessage = vi.fn();
    createStream(onMessage).start();
    const ws = FakeWebSocket.instances[0];

    ws.onopen?.();
    ws.onmessage?.({ data: 'hello' });

    expect(onMessage).toHaveBeenCalledWith('hello');
  });

  it('연결이 끊기면 1초 뒤 다시 접속한다', () => {
    createStream().start();
    FakeWebSocket.instances[0].onclose?.({ code: 1006 });

    vi.advanceTimersByTime(999);
    expect(FakeWebSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it('연결에 성공하면 재접속 대기 시간이 처음(1초)으로 돌아간다', () => {
    createStream().start();
    FakeWebSocket.instances[0].onclose?.({ code: 1006 });
    vi.advanceTimersByTime(1000); // 2번째 연결 시도
    FakeWebSocket.instances[1].onclose?.({ code: 1006 });
    vi.advanceTimersByTime(2000); // 3번째 연결 시도 (2초 대기)
    FakeWebSocket.instances[2].onopen?.();
    FakeWebSocket.instances[2].onclose?.({ code: 1006 });

    vi.advanceTimersByTime(1000);
    expect(FakeWebSocket.instances).toHaveLength(4);
  });

  it('메시지가 10초 동안 없으면 연결을 버리고 다시 접속한다', () => {
    createStream().start();
    const first = FakeWebSocket.instances[0];
    first.onopen?.();

    vi.advanceTimersByTime(9_000);
    first.onmessage?.({ data: 'tick' }); // 메시지가 오면 타이머가 다시 시작된다
    vi.advanceTimersByTime(9_000);
    expect(first.closed).toBe(false);

    vi.advanceTimersByTime(1_000);
    expect(first.closed).toBe(true);
    vi.advanceTimersByTime(1_000);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it('stop하면 끊겨도 다시 접속하지 않는다', () => {
    const stream = createStream();
    stream.start();
    stream.stop();
    FakeWebSocket.instances[0].onclose?.({ code: 1000 });

    vi.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });
});
