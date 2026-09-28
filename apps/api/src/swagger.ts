import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * /api/docs      : API 문서 페이지 (브라우저에서 바로 호출 가능)
 * /api/docs-json : OpenAPI JSON (web의 API 코드 자동 생성에 사용 예정)
 */
export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Paper Futures API')
    .setDescription('모의 선물거래소 API')
    .setVersion('0.1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
}
