import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from './config/env.js';

// main.ts와 e2e 테스트가 같은 설정으로 앱을 띄우도록 한곳에 모음
export function setupApp(app: INestApplication) {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.setGlobalPrefix('api');
  app.enableCors({ origin: config.get('WEB_ORIGIN', { infer: true }) });
  app.enableShutdownHooks();
}
