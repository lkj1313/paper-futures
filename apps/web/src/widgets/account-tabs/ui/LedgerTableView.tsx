import type {
  AccountLedgerEntry,
  LedgerEntryType,
} from '@paper-futures/shared';
import {
  formatDateTime,
  formatSignedUsdt,
  formatUsdt,
} from '@/shared/lib/format';
import { toneOf } from '@/shared/lib/tone';
import { LoadMoreButton, type LoadMoreProps } from './LoadMoreButton';
import { CELL_CLASS, EMPTY_CLASS, HEAD_CELL_CLASS, TABLE_CLASS } from './table';

const HEADERS = ['시간', '종류', '금액(USDT)', '변동 후 잔고(USDT)'];

const TYPE_LABEL: Record<LedgerEntryType, string> = {
  SIGNUP_BONUS: '가입 보너스',
  TRADING_FEE: '거래 수수료',
  REALIZED_PNL: '실현 손익',
  LIQUIDATION: '강제 청산',
  FUNDING_FEE: '펀딩비',
  DEPOSIT: '충전',
};

export interface LedgerTableViewProps extends LoadMoreProps {
  entries: AccountLedgerEntry[] | undefined;
}

export function LedgerTableView({
  entries,
  ...loadMore
}: LedgerTableViewProps) {
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
        <tbody>
          {entries?.map((entry) => (
            <tr key={entry.id} className="border-t border-border/50">
              <td className={`${CELL_CLASS} text-muted-foreground`}>
                {formatDateTime(Date.parse(entry.createdAt))}
              </td>
              <td className={CELL_CLASS}>{TYPE_LABEL[entry.type]}</td>
              <td className={CELL_CLASS}>
                <span className={toneOf(entry.amount)}>
                  {formatSignedUsdt(entry.amount)}
                </span>
              </td>
              <td className={CELL_CLASS}>{formatUsdt(entry.balanceAfter)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {entries?.length === 0 && (
        <p className={EMPTY_CLASS}>자산 기록이 없습니다</p>
      )}
      <LoadMoreButton {...loadMore} />
    </div>
  );
}
