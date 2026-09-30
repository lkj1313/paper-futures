import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { createValidationPipe } from './common/validation.js';
import type { Env } from './config/env.js';
import { SocketIoAdapter } from './realtime/socket-io.adapter.js';
import { setupSwagger } from './swagger.js';

// main.ts와 e2e 테스트가 같은 설정으로 앱을 띄우도록 한곳에 모음
export function setupApp(app: INestApplication) {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.setGlobalPrefix('api');
  // refresh 토큰 쿠키를 req.cookies로 읽기 위해 필요
  app.use(cookieParser());
  app.useGlobalPipes(createValidationPipe());
  const webOrigin = config.get('WEB_ORIGIN', { infer: true });
  app.enableCors({
    origin: webOrigin,
    credentials: true, // 쿠키를 주고받을 수 있게 허용
  });
  // 실시간 연결(socket.io)도 같은 포트, 같은 출처 규칙을 쓴다
  app.useWebSocketAdapter(new SocketIoAdapter(app, webOrigin));
  app.enableShutdownHooks();

  // API 목록이 외부에 공개되지 않도록 운영 환경에서는 끈다
  if (config.get('NODE_ENV', { infer: true }) !== 'production') {
    setupSwagger(app);
  }
}
