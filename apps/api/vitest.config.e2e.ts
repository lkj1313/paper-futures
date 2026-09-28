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

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    env: { NODE_ENV: 'test', DATABASE_URL: testDatabaseUrl },
    globalSetup: ['./test/global-setup.ts'],
    // 모든 e2e 파일이 같은 테스트 DB를 쓰므로 파일을 하나씩 순서대로 실행
    fileParallelism: false,
  },
});
