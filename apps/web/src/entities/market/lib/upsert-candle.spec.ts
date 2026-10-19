import type { Candle } from '@paper-futures/shared';
import { describe, expect, it } from 'vitest';
import { upsertCandle } from './upsert-candle';

const candle = (time: number, close: string): Candle => ({
  time,
  open: '83000',
  high: '83500',
  low: '82500',
  close,
  volume: '10',
});

describe('upsertCandle', () => {
  it('마지막 봉과 시작 시각이 같으면 그 봉을 바꾼다', () => {
    const candles = [candle(1, '83000'), candle(2, '83100')];

    expect(upsertCandle(candles, candle(2, '83200'))).toEqual([
      candle(1, '83000'),
      candle(2, '83200'),
    ]);
  });

  it('더 늦게 시작한 봉이면 뒤에 붙인다', () => {
    const candles = [candle(1, '83000'), candle(2, '83100')];

    expect(upsertCandle(candles, candle(3, '83300'))).toEqual([
      ...candles,
      candle(3, '83300'),
    ]);
  });

  it('비어 있으면 그 봉 하나로 시작한다', () => {
    expect(upsertCandle([], candle(1, '83000'))).toEqual([candle(1, '83000')]);
  });

  it('마지막 봉보다 이른 봉은 무시하고 같은 목록을 돌려준다', () => {
    const candles = [candle(1, '83000'), candle(2, '83100')];

    expect(upsertCandle(candles, candle(1, '82000'))).toBe(candles);
  });
});
