import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import type { LedgerEntry } from '../../generated/prisma/client.js';
import { LedgerEntryType } from '../../generated/prisma/enums.js';

export class LedgerQueryDto {
  /** 한 번에 가져올 개수 (1~100) */
  @IsOptional()
  @Type(() => Number) // 쿼리스트링은 문자열로 들어오므로 숫자로 바꾼다
  @IsInt({ message: 'limit은 정수여야 합니다.' })
  @Min(1, { message: 'limit은 1 이상이어야 합니다.' })
  @Max(100, { message: 'limit은 100 이하여야 합니다.' })
  limit: number = 20;

  /** 이전 응답의 nextCursor. 비우면 가장 최신부터 */
  @IsOptional()
  @IsUUID('all', { message: 'cursor 형식이 올바르지 않습니다.' })
  cursor?: string;
}

export class LedgerEntryDto {
  id: string;

  @ApiProperty({ enum: LedgerEntryType, enumName: 'LedgerEntryType' })
  type: LedgerEntryType;

  /** 부호 포함 변동 금액 (문자열) */
  amount: string;

  /** 이 기록 직후의 잔고 (문자열) */
  balanceAfter: string;

  createdAt: Date;

  static from(entry: LedgerEntry): LedgerEntryDto {
    return {
      id: entry.id,
      type: entry.type,
      amount: entry.amount.toString(),
      balanceAfter: entry.balanceAfter.toString(),
      createdAt: entry.createdAt,
    };
  }
}

export class LedgerPageDto {
  @ApiProperty({ type: [LedgerEntryDto] })
  items: LedgerEntryDto[];

  /** 다음 페이지 요청에 쓸 커서. 마지막 페이지면 null */
  @ApiProperty({ type: String, nullable: true })
  nextCursor: string | null;
}
