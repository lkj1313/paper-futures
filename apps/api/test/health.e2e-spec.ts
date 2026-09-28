import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils.js';

describe('health, 공통 에러 응답 (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('서버, DB, Redis가 정상이면 200과 ok를 반환한다', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({ status: 'ok', db: 'ok', redis: 'ok' });
  });

  it('/api 아래의 없는 경로는 공통 에러 형식의 404', () => {
    return request(app.getHttpServer())
      .get('/api/nope')
      .expect(404)
      .expect((res) => {
        expect(res.body).toEqual({
          statusCode: 404,
          code: 'NOT_FOUND',
          message: expect.any(String),
        });
      });
  });

  it('JSON 형식이 깨진 요청은 공통 에러 형식의 400', () => {
    return request(app.getHttpServer())
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{ broken')
      .expect(400)
      .expect((res) => {
        expect(res.body).toMatchObject({
          statusCode: 400,
          code: 'BAD_REQUEST',
        });
      });
  });

  it('개발/테스트 환경에서는 OpenAPI 문서를 제공한다', () => {
    return request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200)
      .expect((res) => {
        expect(res.body.paths).toHaveProperty('/api/health');
      });
  });
});
