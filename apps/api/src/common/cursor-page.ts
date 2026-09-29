import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

/** 커서 방식 목록 조회의 공통 쿼리 (?limit=20&cursor=...) */
export class CursorPageQueryDto {
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

/**
 * limit + 1개를 조회한 결과를 페이지로 자른다.
 * 하나가 더 있으면 다음 페이지가 있다는 뜻이고, 이번 페이지 마지막 id가 다음 커서가 된다.
 */
export function toCursorPage<T extends { id: string }>(
  rows: T[],
  limit: number,
) {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
}

/**
 * 커서 조회용 Prisma 인자. UUID v7은 생성 시간 순으로 커지므로
 * id 내림차순이 최신순이고, 커서보다 작은 id가 다음 페이지다.
 *
 * @example
 * const page = cursorPageArgs(query);
 * prisma.order.findMany({ ...page, where: { ...page.where, userId } });
 */
export function cursorPageArgs({ limit, cursor }: CursorPageQueryDto) {
  return {
    where: cursor ? { id: { lt: cursor } } : {},
    orderBy: { id: 'desc' as const },
    take: limit + 1, // 하나 더 가져와서 다음 페이지가 있는지 확인한다
  };
}

/** 응답의 nextCursor 문서화 */
export const ApiNextCursor = () =>
  ApiProperty({
    type: String,
    nullable: true,
    description: '다음 페이지 요청에 쓸 커서. 마지막 페이지면 null',
  });
