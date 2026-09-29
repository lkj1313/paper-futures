import { describe, expect, it } from 'vitest';
import type { PositionSide } from '../trading.js';
import { Decimal } from './decimal.js';
import { isolatedLiquidationPrice } from './liquidation.js';
import { maintenanceMargin, notional } from './margin.js';
import { unrealizedPnl } from './pnl.js';

// 예시: BTC 83,000에 0.1개, 레버리지 10배(증거금 830), 유지증거금률 0.4%
const position = (side: PositionSide) => ({
  side,
  entryPrice: '83000',
  qty: '0.1',
  isolatedMargin: '830',
  maintenanceMarginRate: '0.004',
});

describe('isolatedLiquidationPrice', () => {
  it('롱: (8300 − 830) ÷ (0.1 × 0.996) = 75,000', () => {
    expect(isolatedLiquidationPrice(position('LONG')).toString()).toBe('75000');
  });

  it('숏: (8300 + 830) ÷ (0.1 × 1.004) ≈ 90,936.25', () => {
    expect(
      isolatedLiquidationPrice(position('SHORT')).toDecimalPlaces(2).toString(),
    ).toBe('90936.25');
  });

  it.each(['LONG', 'SHORT'] as const)(
    '%s: 청산가에서 "증거금 + 손익"이 정확히 유지증거금과 같다',
    (side) => {
      const p = position(side);
      const liq = isolatedLiquidationPrice(p);

      const equity = new Decimal(p.isolatedMargin).add(
        unrealizedPnl(side, p.entryPrice, liq, p.qty),
      );
      const required = maintenanceMargin(
        notional(p.qty, liq),
        p.maintenanceMarginRate,
      );
      expect(equity.sub(required).abs().lt('1e-20')).toBe(true);
    },
  );

  it('레버리지가 낮을수록 청산가가 진입가에서 멀어진다', () => {
    const at = (margin: string) =>
      isolatedLiquidationPrice({ ...position('LONG'), isolatedMargin: margin });
    // 10배(830) → 75,000 / 2배(4150) → 약 41,666
    expect(at('4150').lt(at('830'))).toBe(true);
  });

  it('증거금이 명목가치보다 크면(1배 이하) 롱은 절대 청산되지 않아 0', () => {
    expect(
      isolatedLiquidationPrice({
        ...position('LONG'),
        isolatedMargin: '9000',
      }).toString(),
    ).toBe('0');
  });
});
