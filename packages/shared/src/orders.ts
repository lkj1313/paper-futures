import type { AccountOrder, AccountPosition } from './account.js';
import type { MarketSymbol } from './market.js';
import type { OrderSide } from './trading.js';

export const PLACEABLE_ORDER_TYPES = ['MARKET', 'LIMIT'] as const;
export type PlaceableOrderType = (typeof PLACEABLE_ORDER_TYPES)[number];

export interface PlaceOrderRequest {
  symbol: MarketSymbol;
  side: OrderSide;
  type: PlaceableOrderType;
  qty: string;
  price?: string;
  leverage?: number;
  reduceOnly?: boolean;
}

export interface PlaceOrderResponse {
  order: AccountOrder;
  position: AccountPosition | null;
}
