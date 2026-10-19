import {
  type Candle,
  MARKET_SPECS,
  type MarketSymbol,
} from '@paper-futures/shared';
import {
  type CandlestickData,
  type HistogramData,
  type PriceFormat,
  type Time,
  TickMarkType,
  type UTCTimestamp,
} from 'lightweight-charts';

export const UP_COLOR = '#0ecb81';
export const DOWN_COLOR = '#f6465d';
const UP_VOLUME_COLOR = 'rgba(14, 203, 129, 0.35)';
const DOWN_VOLUME_COLOR = 'rgba(246, 70, 93, 0.35)';

const toSeconds = (ms: number) => (ms / 1000) as UTCTimestamp;

export const toBar = (candle: Candle): CandlestickData<Time> => ({
  time: toSeconds(candle.time),
  open: Number(candle.open),
  high: Number(candle.high),
  low: Number(candle.low),
  close: Number(candle.close),
});

export const toVolume = (candle: Candle): HistogramData<Time> => ({
  time: toSeconds(candle.time),
  value: Number(candle.volume),
  color:
    Number(candle.close) >= Number(candle.open)
      ? UP_VOLUME_COLOR
      : DOWN_VOLUME_COLOR,
});

export type ChartUpdate =
  { kind: 'none' } | { kind: 'set' } | { kind: 'update'; candle: Candle };

export function planChartUpdate(
  prev: Candle[] | undefined,
  next: Candle[],
): ChartUpdate {
  if (prev === next) return { kind: 'none' };
  const last = next.at(-1);
  const grew = next.length - (prev?.length ?? 0);
  const sameHistory =
    prev !== undefined &&
    prev.length > 0 &&
    (grew === 0 || grew === 1) &&
    next[0]?.time === prev[0]?.time &&
    prev.slice(0, -1).every((candle, i) => next[i] === candle);
  return sameHistory && last
    ? { kind: 'update', candle: last }
    : { kind: 'set' };
}

export function priceFormatOf(symbol: MarketSymbol): PriceFormat {
  const { tickSize } = MARKET_SPECS[symbol];
  return {
    type: 'price',
    precision: tickSize.split('.')[1]?.length ?? 0,
    minMove: Number(tickSize),
  };
}

const pad = (n: number) => String(n).padStart(2, '0');
const toDate = (time: Time) => new Date((time as number) * 1000);
const hourMinute = (date: Date) =>
  `${pad(date.getHours())}:${pad(date.getMinutes())}`;

export function formatChartTime(time: Time) {
  const date = toDate(time);
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${hourMinute(date)}`;
}

export function formatTickMark(time: Time, type: TickMarkType) {
  const date = toDate(time);
  switch (type) {
    case TickMarkType.Year:
      return String(date.getFullYear());
    case TickMarkType.Month:
      return `${date.getMonth() + 1}월`;
    case TickMarkType.DayOfMonth:
      return `${date.getDate()}일`;
    case TickMarkType.Time:
      return hourMinute(date);
    case TickMarkType.TimeWithSeconds:
      return `${hourMinute(date)}:${pad(date.getSeconds())}`;
  }
}
