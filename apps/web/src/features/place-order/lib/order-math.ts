import {
  type AccountPosition,
  FEE_RATES,
  floorToStep,
  initialMargin,
  isMultipleOf,
  MARKET_SPECS,
  type MarketSymbol,
  notional,
  type OrderSide,
  type PlaceableOrderType,
  toDecimal,
  tradingFee,
} from '@paper-futures/shared';

const NUMBER = /^\d+(\.\d+)?$/;

const isPositive = (value: string) =>
  NUMBER.test(value) && toDecimal(value).gt(0);

const feeRateOf = (type: PlaceableOrderType) =>
  type === 'MARKET' ? FEE_RATES.taker : FEE_RATES.maker;

export const reduces = (side: OrderSide, position?: AccountPosition) =>
  position !== undefined && (position.side === 'LONG') === (side === 'SELL');

export function orderCost({
  qty,
  price,
  leverage,
  type,
}: {
  qty: string;
  price: string;
  leverage: number;
  type: PlaceableOrderType;
}) {
  if (!isPositive(qty) || !isPositive(price)) {
    return { margin: '0', fee: '0', total: '0' };
  }
  const value = notional(qty, price);
  const margin = initialMargin(value, leverage).toDecimalPlaces(8);
  const fee = tradingFee(value, feeRateOf(type)).toDecimalPlaces(8);
  return {
    margin: margin.toFixed(),
    fee: fee.toFixed(),
    total: margin.plus(fee).toFixed(),
  };
}

export function maxOrderQty({
  symbol,
  side,
  type,
  price,
  leverage,
  available,
  position,
}: {
  symbol: MarketSymbol;
  side: OrderSide;
  type: PlaceableOrderType;
  price: string;
  leverage: number;
  available: string;
  position?: AccountPosition;
}) {
  if (position && reduces(side, position)) return position.qty;
  if (!isPositive(price) || !isPositive(available)) return '0';

  const appliedLeverage = position?.leverage ?? leverage;
  const unitCost = toDecimal(price).mul(
    toDecimal(1).div(appliedLeverage).plus(feeRateOf(type)),
  );
  return floorToStep(
    toDecimal(available).div(unitCost),
    MARKET_SPECS[symbol].stepSize,
  ).toFixed();
}

export const qtyByPercent = (
  symbol: MarketSymbol,
  maxQty: string,
  percent: number,
) =>
  floorToStep(
    toDecimal(maxQty).mul(percent).div(100),
    MARKET_SPECS[symbol].stepSize,
  ).toFixed();

export function checkOrder({
  symbol,
  side,
  type,
  qty,
  price,
  position,
}: {
  symbol: MarketSymbol;
  side: OrderSide;
  type: PlaceableOrderType;
  qty: string;
  price: string;
  position?: AccountPosition;
}): string | null {
  const spec = MARKET_SPECS[symbol];
  if (!isPositive(qty) || !isMultipleOf(qty, spec.stepSize)) {
    return `수량은 ${spec.stepSize} 단위의 0보다 큰 값이어야 합니다.`;
  }
  if (
    type === 'LIMIT' &&
    (!isPositive(price) || !isMultipleOf(price, spec.tickSize))
  ) {
    return `가격은 ${spec.tickSize} 단위의 0보다 큰 값이어야 합니다.`;
  }
  if (
    !reduces(side, position) &&
    isPositive(price) &&
    notional(qty, price).lt(spec.minNotional)
  ) {
    return `최소 주문 금액은 ${spec.minNotional} USDT입니다.`;
  }
  return null;
}
