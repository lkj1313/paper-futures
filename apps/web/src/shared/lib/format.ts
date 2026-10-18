import {
  MARKET_SPECS,
  type MarketSymbol,
  toDecimal,
} from '@paper-futures/shared';

type SignDisplay = 'auto' | 'exceptZero';
type NumericString = `${number}`;

const formatters = new Map<string, Intl.NumberFormat>();

function fixed(digits: number, signDisplay: SignDisplay = 'auto') {
  const key = `${digits}:${signDisplay}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
      signDisplay,
    });
    formatters.set(key, formatter);
  }
  return formatter;
}

const compact = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2,
});

const decimalsOf = (step: string) => step.split('.')[1]?.length ?? 0;
const priceDigits = (symbol: MarketSymbol) =>
  decimalsOf(MARKET_SPECS[symbol].tickSize);
const qtyDigits = (symbol: MarketSymbol) =>
  decimalsOf(MARKET_SPECS[symbol].stepSize);
const pad = (n: number) => String(n).padStart(2, '0');

export const formatPrice = (symbol: MarketSymbol, value: string) =>
  fixed(priceDigits(symbol)).format(value as NumericString);

export const formatQty = (symbol: MarketSymbol, value: string) =>
  fixed(qtyDigits(symbol)).format(value as NumericString);

export const formatSignedPrice = (symbol: MarketSymbol, value: string) =>
  fixed(priceDigits(symbol), 'exceptZero').format(value as NumericString);

export const formatUsdt = (value: string) =>
  fixed(2).format(value as NumericString);

export const formatSignedUsdt = (value: string) =>
  fixed(2, 'exceptZero').format(value as NumericString);

export const formatPercent = (value: string) =>
  `${fixed(2, 'exceptZero').format(value as NumericString)}%`;

export const formatRatioPercent = (value: string) =>
  formatPercent(toDecimal(value).times(100).toString());

export const formatFundingRate = (value: string) =>
  `${fixed(4).format(toDecimal(value).times(100).toString() as NumericString)}%`;

export const formatCompact = (value: string) =>
  compact.format(value as NumericString);

export function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return `${pad(hours)}:${pad(minutes)}:${pad(total % 60)}`;
}

export function formatTime(ms: number) {
  const date = new Date(ms);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function formatDateTime(ms: number) {
  const date = new Date(ms);
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${formatTime(ms)}`;
}
