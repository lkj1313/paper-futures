import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

// e2e 테스트는 개발 DB가 아니라 테스트 전용 DB를 쓴다
const { parsed = {} } = config({
  path: fileURLToPath(new URL('../../.env', import.meta.url)),
  quiet: true,
});
const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? parsed.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error(
    'TEST_DATABASE_URL이 설정되지 않았습니다. .env를 확인하세요.',
  );
}

// 테스트마다 Redis를 비우므로, 개발용 0번 DB를 가리키면 실행을 막는다
const testRedisUrl = process.env.TEST_REDIS_URL ?? parsed.TEST_REDIS_URL;
const testRedisDb = testRedisUrl ? new URL(testRedisUrl).pathname.slice(1) : '';
if (!testRedisUrl || !testRedisDb || testRedisDb === '0') {
  throw new Error(
    'TEST_REDIS_URL은 0번이 아닌 Redis DB를 가리켜야 합니다. (예: redis://localhost:6379/1)',
  );
}

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl,
      REDIS_URL: testRedisUrl,
    },
    globalSetup: ['./test/global-setup.ts'],
    // 모든 e2e 파일이 같은 테스트 DB를 쓰므로 파일을 하나씩 순서대로 실행
    fileParallelism: false,
  },
});
