import type { Candle, MarketSymbol } from '@paper-futures/shared';
import {
  CandlestickSeries,
  ColorType,
  createChart,
  CrosshairMode,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
} from 'lightweight-charts';
import { useEffect, useRef } from 'react';
import {
  DOWN_COLOR,
  formatChartTime,
  formatTickMark,
  planChartUpdate,
  priceFormatOf,
  toBar,
  toVolume,
  UP_COLOR,
} from '../lib/chart-data';

const NO_CANDLES: Candle[] = [];
const TEXT_COLOR = '#a1a1aa';
const GRID_COLOR = 'rgba(255, 255, 255, 0.04)';
const BORDER_COLOR = 'rgba(255, 255, 255, 0.1)';

interface ChartParts {
  chart: IChartApi;
  bars: ISeriesApi<'Candlestick'>;
  volume: ISeriesApi<'Histogram'>;
}

export interface PriceChartViewProps {
  symbol: MarketSymbol;
  candles: Candle[] | undefined;
  failed?: boolean;
}

export function PriceChartView({
  symbol,
  candles,
  failed = false,
}: PriceChartViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const partsRef = useRef<ChartParts | null>(null);
  const drawnRef = useRef<Candle[] | undefined>(undefined);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: TEXT_COLOR,
        fontFamily: "'Geist Variable', sans-serif",
      },
      grid: {
        vertLines: { color: GRID_COLOR },
        horzLines: { color: GRID_COLOR },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: BORDER_COLOR },
      timeScale: {
        borderColor: BORDER_COLOR,
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: formatTickMark,
      },
      localization: { timeFormatter: formatChartTime },
    });
    const bars = chart.addSeries(CandlestickSeries, {
      upColor: UP_COLOR,
      downColor: DOWN_COLOR,
      wickUpColor: UP_COLOR,
      wickDownColor: DOWN_COLOR,
      borderVisible: false,
    });
    const volume = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      lastValueVisible: false,
      priceLineVisible: false,
    });
    volume.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    partsRef.current = { chart, bars, volume };

    return () => {
      chart.remove();
      partsRef.current = null;
      drawnRef.current = undefined;
    };
  }, []);

  useEffect(() => {
    partsRef.current?.bars.applyOptions({ priceFormat: priceFormatOf(symbol) });
  }, [symbol]);

  useEffect(() => {
    const parts = partsRef.current;
    if (!parts) return;
    const next = candles ?? NO_CANDLES;
    const plan = planChartUpdate(drawnRef.current, next);
    if (plan.kind === 'set') {
      parts.bars.setData(next.map(toBar));
      parts.volume.setData(next.map(toVolume));
      parts.chart.timeScale().scrollToRealTime();
    } else if (plan.kind === 'update') {
      parts.bars.update(toBar(plan.candle));
      parts.volume.update(toVolume(plan.candle));
    }
    drawnRef.current = next;
  }, [candles]);

  return (
    <div className="relative h-full min-h-0">
      <div ref={containerRef} className="h-full w-full" />
      {!candles && (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          {failed ? '캔들을 불러오지 못했습니다' : '차트를 불러오는 중…'}
        </p>
      )}
    </div>
  );
}
