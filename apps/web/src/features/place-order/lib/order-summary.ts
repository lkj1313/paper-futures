import type {
  AccountPosition,
  MarketSymbol,
  OrderSide,
  PlaceableOrderType,
} from '@paper-futures/shared';
import { maxOrderQty, orderCost, reduces } from './order-math';

export interface SideSummary {
  referencePrice: string | null;
  reduces: boolean;
  cost: string | null;
  maxQty: string;
}

export interface OrderSummary {
  BUY: SideSummary;
  SELL: SideSummary;
  openingSide: OrderSide;
  leverage: number;
}

export function buildOrderSummary({
  symbol,
  type,
  price,
  qty,
  available,
  savedLeverage,
  position,
  bestBid,
  bestAsk,
  lastPrice,
}: {
  symbol: MarketSymbol;
  type: PlaceableOrderType;
  price: string;
  qty: string;
  available?: string;
  savedLeverage: number;
  position?: AccountPosition;
  bestBid?: string;
  bestAsk?: string;
  lastPrice?: string;
}): OrderSummary {
  const leverage = position?.leverage ?? savedLeverage;

  const referencePriceOf = (side: OrderSide) => {
    if (type === 'LIMIT') return price || null;
    return (side === 'BUY' ? bestAsk : bestBid) ?? lastPrice ?? null;
  };

  const sideSummary = (side: OrderSide): SideSummary => {
    const referencePrice = referencePriceOf(side);
    const reducing = reduces(side, position);
    return {
      referencePrice,
      reduces: reducing,
      cost: reducing
        ? null
        : orderCost({ qty, price: referencePrice ?? '', leverage, type }).total,
      maxQty: maxOrderQty({
        symbol,
        side,
        type,
        price: referencePrice ?? '',
        leverage: savedLeverage,
        available: available ?? '0',
        position,
      }),
    };
  };

  return {
    BUY: sideSummary('BUY'),
    SELL: sideSummary('SELL'),
    openingSide: position?.side === 'SHORT' ? 'SELL' : 'BUY',
    leverage,
  };
}
