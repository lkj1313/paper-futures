import {
  type DecimalLike,
  isolatedLiquidationPrice,
  isStale,
  MARKET_SPECS,
  type MarketSymbol,
  type MarkPriceInfo,
  type PositionSide,
  roe,
  unrealizedPnl,
} from '@paper-futures/shared';

type Amount = DecimalLike | { toString(): string };

export interface PositionLike {
  symbol: string;
  side: PositionSide;
  qty: Amount;
  entryPrice: Amount;
  isolatedMargin: Amount;
}

/** 마크가격 기준으로 계산하는 값. 마크가격이 없으면 손익과 ROE는 null */
export interface PositionLiveValues {
  markPrice: string | null;
  unrealizedPnl: string | null;
  /** 증거금 대비 수익률 (0.24 = 24%) */
  roe: string | null;
  liquidationPrice: string;
  stale: boolean;
}

// 화면에 보여줄 값은 DB와 같은 소수 8자리로 맞춘다
const fmt = (value: { toDecimalPlaces(dp: number): { toFixed(): string } }) =>
  value.toDecimalPlaces(8).toFixed();

export function toPositionLiveValues(
  position: PositionLike,
  mark: MarkPriceInfo | undefined,
  now = Date.now(),
): PositionLiveValues {
  const qty = position.qty.toString();
  const entryPrice = position.entryPrice.toString();
  const margin = position.isolatedMargin.toString();

  // 청산가는 마크가격과 상관없이 포지션 정보만으로 정해진다
  const liquidationPrice = fmt(
    isolatedLiquidationPrice({
      side: position.side,
      entryPrice,
      qty,
      isolatedMargin: margin,
      maintenanceMarginRate:
        MARKET_SPECS[position.symbol as MarketSymbol].maintenanceMarginRate,
    }),
  );

  if (!mark) {
    return {
      markPrice: null,
      unrealizedPnl: null,
      roe: null,
      liquidationPrice,
      stale: true,
    };
  }

  const pnl = unrealizedPnl(position.side, entryPrice, mark.markPrice, qty);
  return {
    markPrice: mark.markPrice,
    unrealizedPnl: fmt(pnl),
    roe: fmt(roe(pnl, margin)),
    liquidationPrice,
    stale: isStale(mark.receivedAt, now),
  };
}
