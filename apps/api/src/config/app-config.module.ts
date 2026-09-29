import { fileURLToPath } from 'node:url';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './env.js';

/** api와 market-data 프로세스가 함께 쓰는 환경변수 설정 */
export const AppConfigModule = ConfigModule.forRoot({
  isGlobal: true,
  // src/, dist/ 어디서 실행되든 레포 루트의 .env를 가리킴
  envFilePath: fileURLToPath(new URL('../../../../.env', import.meta.url)),
  validate: validateEnv,
});
