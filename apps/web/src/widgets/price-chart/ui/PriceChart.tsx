import type { CandleInterval, MarketSymbol } from '@paper-futures/shared';
import { useState } from 'react';
import { useCandles, useCandleSubscription } from '@/entities/market';
import { IntervalPicker } from './IntervalPicker';
import { PriceChartView } from './PriceChartView';

const DEFAULT_INTERVAL: CandleInterval = '15m';

export function PriceChart({ symbol }: { symbol: MarketSymbol }) {
  const [interval, setCandleInterval] =
    useState<CandleInterval>(DEFAULT_INTERVAL);
  useCandleSubscription(symbol, interval);
  const { data: candles, isError } = useCandles(symbol, interval);

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-2 pt-2">
        <IntervalPicker value={interval} onChange={setCandleInterval} />
      </div>
      <div className="min-h-0 flex-1">
        <PriceChartView symbol={symbol} candles={candles} failed={isError} />
      </div>
    </div>
  );
}
