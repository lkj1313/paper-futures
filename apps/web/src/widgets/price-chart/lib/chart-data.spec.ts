import type { Candle } from '@paper-futures/shared';
import { TickMarkType } from 'lightweight-charts';
import { describe, expect, it } from 'vitest';
import {
  formatChartTime,
  formatTickMark,
  planChartUpdate,
  priceFormatOf,
  toBar,
  toVolume,
} from './chart-data';

const candle = (time: number, open: string, close: string): Candle => ({
  time,
  open,
  high: '83500.5',
  low: '82500.1',
  close,
  volume: '12.345',
});

describe('toBar / toVolume', () => {
  it('ms 시각을 초로, 문자열 가격을 숫자로 바꾼다', () => {
    expect(toBar(candle(1792329300000, '83000.1', '83100.2'))).toEqual({
      time: 1792329300,
      open: 83000.1,
      high: 83500.5,
      low: 82500.1,
      close: 83100.2,
    });
  });

  it('거래량은 오른 봉이면 상승색, 내린 봉이면 하락색 막대로 바꾼다', () => {
    const up = toVolume(candle(1792329300000, '83000', '83100'));
    const flat = toVolume(candle(1792329300000, '83000', '83000'));
    const down = toVolume(candle(1792329300000, '83100', '83000'));

    expect(up).toMatchObject({ time: 1792329300, value: 12.345 });
    expect(flat.color).toBe(up.color);
    expect(down.color).not.toBe(up.color);
  });
});

describe('planChartUpdate', () => {
  const a = candle(1, '1', '1');
  const b = candle(2, '1', '1');
  const c = candle(3, '1', '1');

  it('처음이거나 비어 있었으면 통째로 넣는다', () => {
    expect(planChartUpdate(undefined, [a, b])).toEqual({ kind: 'set' });
    expect(planChartUpdate([], [a, b])).toEqual({ kind: 'set' });
  });

  it('그대로면 아무것도 하지 않는다', () => {
    const candles = [a, b];
    expect(planChartUpdate(candles, candles)).toEqual({ kind: 'none' });
  });

  it('마지막 봉만 바뀌었거나 새 봉 하나가 붙었으면 그 봉만 고친다', () => {
    const changed = candle(2, '1', '2');
    expect(planChartUpdate([a, b], [a, changed])).toEqual({
      kind: 'update',
      candle: changed,
    });
    expect(planChartUpdate([a, b], [a, b, c])).toEqual({
      kind: 'update',
      candle: c,
    });
  });

  it('앞쪽 봉이 바뀌었거나 목록이 통째로 바뀌었으면 다시 넣는다', () => {
    expect(planChartUpdate([a, b, c], [candle(1, '1', '9'), b, c])).toEqual({
      kind: 'set',
    });
    expect(planChartUpdate([a, b], [c])).toEqual({ kind: 'set' });
    expect(planChartUpdate([a], [c])).toEqual({ kind: 'set' });
    expect(planChartUpdate([a], [a, b, c])).toEqual({ kind: 'set' });
  });
});

describe('priceFormatOf', () => {
  it('종목의 호가 단위로 가격 자리수를 정한다', () => {
    expect(priceFormatOf('BTCUSDT')).toEqual({
      type: 'price',
      precision: 1,
      minMove: 0.1,
    });
    expect(priceFormatOf('ETHUSDT')).toEqual({
      type: 'price',
      precision: 2,
      minMove: 0.01,
    });
  });
});

describe('시각 표시', () => {
  const at = (y: number, mo: number, d: number, h: number, mi: number) =>
    new Date(y, mo - 1, d, h, mi).getTime() / 1000;

  it('십자선 시각은 이 컴퓨터 시간대의 월-일 시:분으로 보여 준다', () => {
    expect(formatChartTime(at(2026, 10, 19, 9, 5) as never)).toBe(
      '10-19 09:05',
    );
  });

  it('눈금은 단위에 맞게 연, 월, 일, 시:분으로 보여 준다', () => {
    const time = at(2026, 10, 19, 9, 5) as never;
    expect(formatTickMark(time, TickMarkType.Year)).toBe('2026');
    expect(formatTickMark(time, TickMarkType.Month)).toBe('10월');
    expect(formatTickMark(time, TickMarkType.DayOfMonth)).toBe('19일');
    expect(formatTickMark(time, TickMarkType.Time)).toBe('09:05');
  });
});
