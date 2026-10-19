import type { Candle, MarketSymbol } from '@paper-futures/shared';
import {
  CandlestickSeries,
  ColorType,
  type CreatePriceLineOptions,
  createChart,
  CrosshairMode,
  HistogramSeries,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
} from 'lightweight-charts';
import { useEffect, useRef } from 'react';
import { toTickPrice } from '@/shared/lib/price';
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
import { findDraggableLine } from '../lib/drag';

const NO_CANDLES: Candle[] = [];
const NO_LINES: CreatePriceLineOptions[] = [];
const TEXT_COLOR = '#a1a1aa';
const GRID_COLOR = 'rgba(255, 255, 255, 0.04)';
const BORDER_COLOR = 'rgba(255, 255, 255, 0.1)';

interface ChartParts {
  chart: IChartApi;
  bars: ISeriesApi<'Candlestick'>;
  volume: ISeriesApi<'Histogram'>;
}

interface DrawnLine {
  options: CreatePriceLineOptions;
  line: IPriceLine;
}

interface Drag {
  id: string;
  line: IPriceLine;
  original: number;
  price: string | null;
}

export interface PriceChartViewProps {
  symbol: MarketSymbol;
  candles: Candle[] | undefined;
  failed?: boolean;
  priceLines?: CreatePriceLineOptions[];
  onOrderPriceChange?: (orderId: string, price: string) => Promise<unknown>;
}

export function PriceChartView({
  symbol,
  candles,
  failed = false,
  priceLines = NO_LINES,
  onOrderPriceChange,
}: PriceChartViewProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const partsRef = useRef<ChartParts | null>(null);
  const drawnRef = useRef<Candle[] | undefined>(undefined);
  const linesRef = useRef<DrawnLine[]>([]);
  const latestRef = useRef({ symbol, onOrderPriceChange });

  useEffect(() => {
    latestRef.current = { symbol, onOrderPriceChange };
  });

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

  useEffect(() => {
    const parts = partsRef.current;
    if (!parts) return;
    const created = priceLines.map((options) => ({
      options,
      line: parts.bars.createPriceLine(options),
    }));
    linesRef.current = created;
    return () => {
      linesRef.current = [];
      if (partsRef.current !== parts) return;
      for (const { line } of created) parts.bars.removePriceLine(line);
    };
  }, [priceLines]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    let drag: Drag | null = null;

    const pointerY = (event: PointerEvent) =>
      event.clientY - wrapper.getBoundingClientRect().top;

    const lineAt = (y: number) => {
      const parts = partsRef.current;
      if (!parts || !latestRef.current.onOrderPriceChange) return null;
      const id = findDraggableLine(
        linesRef.current.map(({ options }) => ({
          id: options.id,
          y: parts.bars.priceToCoordinate(options.price),
        })),
        y,
      );
      return linesRef.current.find(({ options }) => id && options.id === id);
    };

    const setScrolling = (enabled: boolean) =>
      partsRef.current?.chart.applyOptions({
        handleScroll: enabled,
        handleScale: enabled,
      });

    const move = (event: PointerEvent) => {
      if (!drag) return;
      const raw = partsRef.current?.bars.coordinateToPrice(pointerY(event));
      if (raw === null || raw === undefined || raw <= 0) return;
      drag.price = toTickPrice(latestRef.current.symbol, String(raw));
      drag.line.applyOptions({ price: Number(drag.price) });
    };

    const end = () => {
      window.removeEventListener('pointermove', move);
      if (!drag) return;
      const { id, line, original, price } = drag;
      drag = null;
      setScrolling(true);
      if (price === null || Number(price) === original) return;
      latestRef.current
        .onOrderPriceChange?.(id, price)
        .catch(() => line.applyOptions({ price: original }));
    };

    const down = (event: PointerEvent) => {
      const target = lineAt(pointerY(event));
      if (!target?.options.id) return;
      event.preventDefault();
      event.stopPropagation();
      setScrolling(false);
      drag = {
        id: target.options.id,
        line: target.line,
        original: target.options.price,
        price: null,
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', end, { once: true });
    };

    const hover = (event: PointerEvent) => {
      if (drag) return;
      wrapper.style.cursor = lineAt(pointerY(event)) ? 'ns-resize' : '';
    };

    wrapper.addEventListener('pointerdown', down, true);
    wrapper.addEventListener('pointermove', hover);
    return () => {
      wrapper.removeEventListener('pointerdown', down, true);
      wrapper.removeEventListener('pointermove', hover);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative h-full min-h-0">
      <div ref={containerRef} className="h-full w-full" />
      {!candles && (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          {failed ? '캔들을 불러오지 못했습니다' : '차트를 불러오는 중…'}
        </p>
      )}
    </div>
  );
}
