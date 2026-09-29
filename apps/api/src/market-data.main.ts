import { NestFactory } from '@nestjs/core';
import { MarketDataModule } from './market-data/market-data.module.js';

// HTTP 서버 없이 모듈과 의존성 주입만 쓰는 별도 프로세스
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(MarketDataModule);
  app.enableShutdownHooks();
}
await bootstrap();
