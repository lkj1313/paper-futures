import { execSync } from 'node:child_process';
import type { TestProject } from 'vitest/node';

// 테스트 시작 전에 테스트 DB에 마이그레이션을 적용한다
export default function setup(project: TestProject) {
  execSync('pnpm exec prisma migrate deploy', {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, DATABASE_URL: project.config.env.DATABASE_URL },
    stdio: 'pipe',
  });
}
