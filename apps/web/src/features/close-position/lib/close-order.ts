import type {
  MarketSymbol,
  PlaceableOrderType,
  PlaceOrderRequest,
  PositionSide,
} from '@paper-futures/shared';

export function closeOrderRequest(
  { symbol, side }: { symbol: MarketSymbol; side: PositionSide },
  {
    type,
    qty,
    price,
  }: { type: PlaceableOrderType; qty: string; price: string },
): PlaceOrderRequest {
  return {
    symbol,
    side: side === 'LONG' ? 'SELL' : 'BUY',
    type,
    qty,
    ...(type === 'LIMIT' && { price }),
    reduceOnly: true,
  };
}
