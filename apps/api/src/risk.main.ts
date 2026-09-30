import { NestFactory } from '@nestjs/core';
import { RiskModule } from './risk/risk.module.js';

// HTTP 서버 없이 마크가격을 지켜보다가 청산만 하는 별도 프로세스
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(RiskModule);
  app.enableShutdownHooks();
}
await bootstrap();
