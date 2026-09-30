import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { REALTIME_PATH } from '@paper-futures/shared';
import type { ServerOptions } from 'socket.io';

/** socket.io 서버 설정: REST API와 같은 포트의 /api/socket.io 경로, 웹 출처만 허용 (CORS) */
export class SocketIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly webOrigin: string,
  ) {
    super(app);
  }

  override createIOServer(port: number, options?: ServerOptions) {
    // socket.io는 옵션을 일부만 받아도 되지만 Nest의 타입은 전부 있는 것으로 적혀 있어서 맞춰 준다
    return super.createIOServer(port, {
      ...options,
      path: REALTIME_PATH,
      cors: { origin: this.webOrigin, credentials: true },
    } as ServerOptions);
  }
}
