import { ApiProperty } from '@nestjs/swagger';
import { ApiNextCursor, CursorPageQueryDto } from '../../common/cursor-page.js';
import type { LedgerEntry } from '../../generated/prisma/client.js';
import { LedgerEntryType } from '../../generated/prisma/enums.js';

/** 원장 조회 쿼리: 공통 커서 쿼리 그대로 */
export class LedgerQueryDto extends CursorPageQueryDto {}

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

  @ApiNextCursor()
  nextCursor: string | null;
}
