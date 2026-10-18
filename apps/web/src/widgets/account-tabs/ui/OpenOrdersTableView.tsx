import { type AccountOrder, isMarketSymbol } from '@paper-futures/shared';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import {
  formatDateTime,
  formatPrice,
  formatQty,
  formatUsdt,
} from '@/shared/lib/format';
import { baseAssetOf } from '@/shared/lib/symbol';
import {
  CELL_CLASS,
  EMPTY,
  EMPTY_CLASS,
  HEAD_CELL_CLASS,
  TABLE_CLASS,
} from './table';

const HEADERS = [
  '시간',
  '종목',
  '종류',
  '방향',
  '가격',
  '수량',
  '묶인 금액(USDT)',
  '',
];

export interface OpenOrdersTableViewProps {
  orders: AccountOrder[] | undefined;
  renderCancel?: (order: AccountOrder) => ReactNode;
}

export function OpenOrdersTableView({
  orders,
  renderCancel,
}: OpenOrdersTableViewProps) {
  return (
    <div className="h-full overflow-auto">
      <table className={TABLE_CLASS}>
        <thead className="text-muted-foreground">
          <tr>
            {HEADERS.map((header, index) => (
              <th key={index} scope="col" className={HEAD_CELL_CLASS}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders?.map((order) => {
            const { symbol } = order;
            if (!isMarketSymbol(symbol)) return null;
            return (
              <tr key={order.id} className="border-t border-border/50">
                <td className={`${CELL_CLASS} text-muted-foreground`}>
                  {formatDateTime(Date.parse(order.createdAt))}
                </td>
                <td className={CELL_CLASS}>
                  <Link
                    to={`/trade/${symbol}`}
                    className="font-medium hover:underline"
                  >
                    {symbol}
                  </Link>
                </td>
                <td className={CELL_CLASS}>
                  {order.reduceOnly ? '지정가 · 닫기' : '지정가'}
                </td>
                <td className={CELL_CLASS}>
                  <span
                    className={order.side === 'BUY' ? 'text-up' : 'text-down'}
                  >
                    {order.side === 'BUY' ? '매수' : '매도'}
                  </span>
                </td>
                <td className={CELL_CLASS}>
                  {order.price ? formatPrice(symbol, order.price) : EMPTY}
                </td>
                <td className={CELL_CLASS}>
                  {formatQty(symbol, order.qty)} {baseAssetOf(symbol)}
                </td>
                <td className={CELL_CLASS}>
                  {order.reduceOnly ? EMPTY : formatUsdt(order.reservedMargin)}
                </td>
                <td className={CELL_CLASS}>{renderCancel?.(order)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {orders?.length === 0 && (
        <p className={EMPTY_CLASS}>대기 중인 주문이 없습니다</p>
      )}
    </div>
  );
}
