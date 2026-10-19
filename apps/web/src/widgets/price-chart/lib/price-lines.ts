import type {
  AccountOrder,
  AccountPosition,
  MarketSymbol,
} from '@paper-futures/shared';
import { type CreatePriceLineOptions, LineStyle } from 'lightweight-charts';
import { formatQty } from '@/shared/lib/format';
import { DOWN_COLOR, UP_COLOR } from './chart-data';

const ENTRY_COLOR = '#a1a1aa';
const LIQUIDATION_COLOR = '#f0b90b';

const line = (
  price: number,
  title: string,
  color: string,
  lineStyle: LineStyle,
): CreatePriceLineOptions => ({
  price,
  title,
  color,
  lineStyle,
  lineWidth: 1,
  axisLabelVisible: true,
});

export function priceLinesOf(
  symbol: MarketSymbol,
  position: AccountPosition | undefined,
  openOrders: AccountOrder[] | undefined,
): CreatePriceLineOptions[] {
  const lines: CreatePriceLineOptions[] = [];

  if (position) {
    const side = position.side === 'LONG' ? '롱' : '숏';
    lines.push(
      line(
        Number(position.entryPrice),
        `진입 ${side}`,
        ENTRY_COLOR,
        LineStyle.Solid,
      ),
    );
    const liquidation = Number(position.liquidationPrice);
    if (liquidation > 0) {
      lines.push(
        line(liquidation, '청산', LIQUIDATION_COLOR, LineStyle.Dashed),
      );
    }
  }

  for (const order of openOrders ?? []) {
    if (order.symbol !== symbol || !order.price) continue;
    const side = order.side === 'BUY' ? '매수' : '매도';
    const title = `${order.reduceOnly ? '닫기 ' : ''}${side} ${formatQty(symbol, order.qty)}`;
    lines.push({
      ...line(
        Number(order.price),
        title,
        order.side === 'BUY' ? UP_COLOR : DOWN_COLOR,
        LineStyle.Dotted,
      ),
      id: order.id,
    });
  }

  return lines;
}
