import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../auth/public.decorator.js';
import { ErrorResponseDto } from '../common/error-response.dto.js';
import { HealthResponseDto } from './health-response.dto.js';
import { HealthService } from './health.service.js';

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: '서버, DB, Redis 상태 확인' })
  @ApiOkResponse({ type: HealthResponseDto })
  @ApiServiceUnavailableResponse({
    description: 'DB 또는 Redis에 연결할 수 없음',
    type: ErrorResponseDto,
  })
  check(): Promise<HealthResponseDto> {
    return this.healthService.check();
  }
}
