import { NestFactory } from '@nestjs/core';
import { EngineModule } from './engine/engine.module.js';

// HTTP 서버 없이 시세를 지켜보다가 청산하고 지정가 주문을 체결하는 별도 프로세스
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(EngineModule);
  app.enableShutdownHooks();
}
await bootstrap();
