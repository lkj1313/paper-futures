import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { REFRESH_COOKIE } from './auth/refresh-cookie.js';

/**
 * /api/docs      : API 문서 페이지 (브라우저에서 바로 호출 가능)
 * /api/docs-json : OpenAPI JSON (web의 API 코드 자동 생성에 사용 예정)
 */
export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Paper Futures API')
    .setDescription('모의 선물거래소 API')
    .setVersion('0.1.0')
    // 문서 페이지의 Authorize 버튼: 로그인해서 받은 accessToken을 넣는다
    .addBearerAuth()
    // refresh/logout API에 쓰는 쿠키. @ApiCookieAuth(REFRESH_COOKIE)와 이름을 맞춘다
    .addCookieAuth(REFRESH_COOKIE, undefined, REFRESH_COOKIE)
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
}
