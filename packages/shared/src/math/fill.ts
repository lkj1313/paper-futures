import type { PriceLevel } from '../market.js';
import type { OrderSide } from '../trading.js';
import { type Decimal, type DecimalLike, toDecimal } from './decimal.js';

export interface FillResult {
  /** 실제로 체결 가능한 수량 */
  filledQty: Decimal;
  /** 호가가 모자라 체결하지 못한 수량 */
  remainingQty: Decimal;
  /** 체결 금액 합계 (Σ 가격 × 수량) */
  notional: Decimal;
  /** 평균 체결가. 하나도 체결되지 않으면 null */
  avgPrice: Decimal | null;
  fullyFilled: boolean;
}

/**
 * 시장가 주문을 호가에 맞춰 채워 보고 예상 체결가를 계산한다.
 * 사기(BUY)는 매도 호가를 싼 것부터, 팔기(SELL)는 매수 호가를 비싼 것부터 채운다.
 * 주문이 클수록 불리한 호가까지 채우게 되어 평균가가 나빠진다 (슬리피지).
 */
export function simulateMarketFill(
  side: OrderSide,
  qty: DecimalLike,
  book: { bids: PriceLevel[]; asks: PriceLevel[] },
): FillResult {
  const levels = (side === 'BUY' ? book.asks : book.bids)
    .map(([price, size]) => ({
      price: toDecimal(price),
      size: toDecimal(size),
    }))
    // Binance가 정렬해서 주지만, 순서가 결과를 바꾸므로 한 번 더 정렬한다
    .sort((a, b) =>
      side === 'BUY' ? a.price.cmp(b.price) : b.price.cmp(a.price),
    );

  let remaining = toDecimal(qty);
  let filled = toDecimal(0);
  let total = toDecimal(0);

  for (const { price, size } of levels) {
    if (remaining.lte(0)) break;
    const take = size.lt(remaining) ? size : remaining;
    filled = filled.add(take);
    total = total.add(take.mul(price));
    remaining = remaining.sub(take);
  }

  return {
    filledQty: filled,
    remainingQty: remaining,
    notional: total,
    avgPrice: filled.isZero() ? null : total.div(filled),
    fullyFilled: remaining.lte(0),
  };
}
