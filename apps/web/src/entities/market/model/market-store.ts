import {
  type DepthEvent,
  type MarketSymbol,
  type MarketTrade,
  type MarkEvent,
  type MarkPriceInfo,
  type OrderBookDepth,
  RECENT_TRADES_LIMIT,
  type Ticker24h,
  type TickerEvent,
  type TradesEvent,
} from '@paper-futures/shared';
import { create } from 'zustand';

export interface SymbolMarket {
  trades: MarketTrade[];
  mark?: MarkPriceInfo;
  depth?: OrderBookDepth;
  ticker?: Ticker24h;
}

interface MarketState {
  bySymbol: Partial<Record<MarketSymbol, SymbolMarket>>;
  applyTrades: (event: TradesEvent) => void;
  applyMark: (event: MarkEvent) => void;
  applyDepth: (event: DepthEvent) => void;
  applyTicker: (event: TickerEvent) => void;
}

const NO_TRADES: MarketTrade[] = [];

export const useMarketStore = create<MarketState>((set) => {
  const update = (
    symbol: MarketSymbol,
    change: (market: SymbolMarket) => Partial<SymbolMarket>,
  ) =>
    set((state) => {
      const market = state.bySymbol[symbol] ?? { trades: NO_TRADES };
      return {
        bySymbol: {
          ...state.bySymbol,
          [symbol]: { ...market, ...change(market) },
        },
      };
    });

  return {
    bySymbol: {},
    applyTrades: ({ symbol, trades }) =>
      update(symbol, (market) => {
        const newestId = market.trades[0]?.id ?? -Infinity;
        const fresh = trades.filter((trade) => trade.id > newestId).reverse();
        return {
          trades: [...fresh, ...market.trades].slice(0, RECENT_TRADES_LIMIT),
        };
      }),
    applyMark: ({ symbol, ...mark }) => update(symbol, () => ({ mark })),
    applyDepth: ({ symbol, ...depth }) => update(symbol, () => ({ depth })),
    applyTicker: ({ symbol, ...ticker }) => update(symbol, () => ({ ticker })),
  };
});

export const useRecentTrades = (symbol: MarketSymbol) =>
  useMarketStore((state) => state.bySymbol[symbol]?.trades ?? NO_TRADES);

export const useMark = (symbol: MarketSymbol) =>
  useMarketStore((state) => state.bySymbol[symbol]?.mark);

export const useDepth = (symbol: MarketSymbol) =>
  useMarketStore((state) => state.bySymbol[symbol]?.depth);

export const useTicker = (symbol: MarketSymbol) =>
  useMarketStore((state) => state.bySymbol[symbol]?.ticker);
