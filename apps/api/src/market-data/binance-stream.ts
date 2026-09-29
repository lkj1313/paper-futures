import type { Logger } from '@nestjs/common';

interface BinanceStreamOptions {
  name: string;
  url: string;
  onMessage: (raw: string) => void;
  logger: Logger;
  /** 이 시간 동안 메시지가 없으면 연결이 멈춘 것으로 보고 다시 접속한다 */
  staleAfterMs?: number;
}

/** 재접속 대기 시간: 1초, 2초, 4초 ... 최대 30초 */
export function reconnectDelay(attempt: number): number {
  return Math.min(30_000, 1_000 * 2 ** attempt);
}

/**
 * Binance WebSocket 연결 하나를 관리한다.
 * - 끊기면 점점 긴 간격으로 다시 접속 (Binance는 24시간마다 연결을 끊는다)
 * - 연결은 살아 있는데 메시지가 안 오면 끊고 다시 접속
 * - ping/pong은 Node 내장 WebSocket이 자동으로 응답한다
 */
export class BinanceStream {
  private ws?: WebSocket;
  private attempt = 0;
  private staleTimer?: NodeJS.Timeout;
  private reconnectTimer?: NodeJS.Timeout;
  private stopped = false;
  private readonly staleAfterMs: number;

  constructor(private readonly options: BinanceStreamOptions) {
    this.staleAfterMs = options.staleAfterMs ?? 10_000;
  }

  start() {
    this.stopped = false;
    this.connect();
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.staleTimer);
    clearTimeout(this.reconnectTimer);
    this.ws?.close();
  }

  private connect() {
    const { name, url, logger } = this.options;
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      this.attempt = 0;
      logger.log(`[${name}] 연결됨`);
      this.armStaleTimer();
    };

    ws.onmessage = (event) => {
      this.armStaleTimer();
      this.options.onMessage(String(event.data));
    };

    // 연결 실패나 에러 뒤에도 close가 뒤따라 오므로 재접속은 close에서만 처리한다
    ws.onerror = () => {};

    ws.onclose = (event) => {
      clearTimeout(this.staleTimer);
      if (this.stopped) return;
      logger.warn(`[${name}] 연결 끊김 (code ${event.code})`);
      this.scheduleReconnect();
    };
  }

  private armStaleTimer() {
    clearTimeout(this.staleTimer);
    this.staleTimer = setTimeout(() => {
      const { name, logger } = this.options;
      logger.warn(
        `[${name}] ${this.staleAfterMs}ms 동안 메시지 없음, 다시 접속`,
      );
      // 응답 없는 연결은 close 완료를 기다리지 않고 버린 뒤 바로 재접속한다
      const stale = this.ws;
      if (stale) {
        stale.onclose = null;
        stale.close();
      }
      this.scheduleReconnect();
    }, this.staleAfterMs);
  }

  private scheduleReconnect() {
    const delay = reconnectDelay(this.attempt++);
    this.options.logger.log(`[${this.options.name}] ${delay}ms 뒤 재접속`);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }
}
