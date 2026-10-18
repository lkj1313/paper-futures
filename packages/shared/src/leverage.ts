import type { MarketSymbol } from './market.js';

export const DEFAULT_LEVERAGE = 10;

export type LeverageSettings = Record<MarketSymbol, number>;

export interface UpdateLeverageRequest {
  leverage: number;
}

export interface UpdateLeverageResponse {
  symbol: MarketSymbol;
  leverage: number;
}
