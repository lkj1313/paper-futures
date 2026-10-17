import { type PriceLevel, toDecimal } from '@paper-futures/shared';

export interface BookRow {
  price: string;
  qty: string;
  total: string;
  ratio: number;
}

function accumulate(levels: PriceLevel[], count: number) {
  let total = toDecimal(0);
  return levels.slice(0, count).map(([price, qty]) => {
    total = total.plus(qty);
    return { price, qty, total };
  });
}

const sumQty = (levels: PriceLevel[]) =>
  levels.reduce((sum, [, qty]) => sum.plus(qty), toDecimal(0));

export function buildBookRows(
  depth: { bids: PriceLevel[]; asks: PriceLevel[] },
  count: number,
): { bids: BookRow[]; asks: BookRow[] } {
  const toRows = (levels: PriceLevel[]): BookRow[] => {
    const rows = accumulate(levels, count);
    const largest = rows.at(-1)?.total;
    return rows.map((row) => ({
      price: row.price,
      qty: row.qty,
      total: row.total.toFixed(),
      ratio:
        !largest || largest.isZero() ? 0 : row.total.div(largest).toNumber(),
    }));
  };

  return { bids: toRows(depth.bids), asks: toRows(depth.asks) };
}

export function bidShare(depth: {
  bids: PriceLevel[];
  asks: PriceLevel[];
}): number | null {
  const bids = sumQty(depth.bids);
  const total = bids.plus(sumQty(depth.asks));
  return total.isZero() ? null : bids.div(total).toNumber();
}
