import {
  type AccountOrder,
  isMarketSymbol,
  type OrderStatus,
  type OrderType,
} from '@paper-futures/shared';
import { Link } from 'react-router';
import {
  formatDateTime,
  formatPrice,
  formatQty,
  formatSignedUsdt,
  formatUsdt,
} from '@/shared/lib/format';
import { baseAssetOf } from '@/shared/lib/symbol';
import { toneOf } from '@/shared/lib/tone';
import { LoadMoreButton, type LoadMoreProps } from './LoadMoreButton';
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
  '주문 가격',
  '평균 체결가',
  '수량',
  '수수료(USDT)',
  '실현 손익(USDT)',
  '상태',
];

const TYPE_LABEL: Record<OrderType, string> = {
  MARKET: '시장가',
  LIMIT: '지정가',
  LIQUIDATION: '청산',
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  NEW: '대기',
  FILLED: '체결',
  CANCELED: '취소',
  EXPIRED: '만료',
};

export interface OrderHistoryTableViewProps extends LoadMoreProps {
  orders: AccountOrder[] | undefined;
}

export function OrderHistoryTableView({
  orders,
  ...loadMore
}: OrderHistoryTableViewProps) {
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
                  {TYPE_LABEL[order.type]}
                  {order.reduceOnly && ' · 닫기'}
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
                  {order.avgFillPrice
                    ? formatPrice(symbol, order.avgFillPrice)
                    : EMPTY}
                </td>
                <td className={CELL_CLASS}>
                  {formatQty(symbol, order.qty)} {baseAssetOf(symbol)}
                </td>
                <td className={CELL_CLASS}>{formatUsdt(order.fee)}</td>
                <td className={CELL_CLASS}>
                  <span className={toneOf(order.realizedPnl)}>
                    {formatSignedUsdt(order.realizedPnl)}
                  </span>
                </td>
                <td className={CELL_CLASS}>{STATUS_LABEL[order.status]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {orders?.length === 0 && (
        <p className={EMPTY_CLASS}>주문 내역이 없습니다</p>
      )}
      <LoadMoreButton {...loadMore} />
    </div>
  );
}
