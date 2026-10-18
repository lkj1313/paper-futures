import type { ReactNode } from 'react';
import { EMPTY_CLASS, HEAD_CELL_CLASS, TABLE_CLASS } from './table';

const HEADERS = [
  '종목',
  '수량',
  '진입가',
  '마크가격',
  '청산가',
  '증거금(USDT)',
  '미실현 손익(ROE)',
  '포지션 닫기',
];

export interface PositionsTableViewProps {
  empty: boolean;
  children?: ReactNode;
}

export function PositionsTableView({
  empty,
  children,
}: PositionsTableViewProps) {
  return (
    <div className="h-full overflow-auto">
      <table className={TABLE_CLASS}>
        <thead className="text-muted-foreground">
          <tr>
            {HEADERS.map((header) => (
              <th key={header} scope="col" className={HEAD_CELL_CLASS}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {empty && <p className={EMPTY_CLASS}>열린 포지션이 없습니다</p>}
    </div>
  );
}
