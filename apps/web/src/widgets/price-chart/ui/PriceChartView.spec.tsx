import type { Candle } from '@paper-futures/shared';
import { render, screen } from '@testing-library/react';
import { CandlestickSeries } from 'lightweight-charts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toBar } from '../lib/chart-data';
import { PriceChartView } from './PriceChartView';

const fake = vi.hoisted(() => {
  const series = () => ({
    setData: vi.fn(),
    update: vi.fn(),
    applyOptions: vi.fn(),
    priceScale: () => ({ applyOptions: vi.fn() }),
  });
  const bars = series();
  const volume = series();
  const chart = {
    addSeries: vi.fn(),
    remove: vi.fn(),
    timeScale: () => ({ scrollToRealTime: vi.fn() }),
  };
  return { bars, volume, chart };
});

vi.mock('lightweight-charts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('lightweight-charts')>()),
  createChart: vi.fn(() => fake.chart),
}));

const candle = (time: number, close: string): Candle => ({
  time,
  open: '83000',
  high: '83500',
  low: '82500',
  close,
  volume: '10',
});

beforeEach(() => {
  vi.clearAllMocks();
  fake.chart.addSeries.mockImplementation((definition) =>
    definition === CandlestickSeries ? fake.bars : fake.volume,
  );
});

describe('PriceChartView', () => {
  it('처음 받은 캔들을 통째로 그리고, 종목의 가격 자리수를 맞춘다', () => {
    const candles = [candle(60_000, '83100'), candle(120_000, '83200')];

    render(<PriceChartView symbol="ETHUSDT" candles={candles} />);

    expect(fake.bars.setData).toHaveBeenCalledExactlyOnceWith(
      candles.map(toBar),
    );
    expect(fake.volume.setData).toHaveBeenCalledOnce();
    expect(fake.bars.applyOptions).toHaveBeenCalledWith({
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    });
  });

  it('마지막 봉만 바뀌면 그 봉만 고치고 통째로 다시 그리지 않는다', () => {
    const first = candle(60_000, '83100');
    const { rerender } = render(
      <PriceChartView
        symbol="BTCUSDT"
        candles={[first, candle(120_000, '83200')]}
      />,
    );

    const changed = candle(120_000, '83250');
    rerender(<PriceChartView symbol="BTCUSDT" candles={[first, changed]} />);

    expect(fake.bars.update).toHaveBeenCalledExactlyOnceWith(toBar(changed));
    expect(fake.volume.update).toHaveBeenCalledOnce();
    expect(fake.bars.setData).toHaveBeenCalledOnce();
  });

  it('목록이 통째로 바뀌면 다시 그린다', () => {
    const { rerender } = render(
      <PriceChartView symbol="BTCUSDT" candles={[candle(60_000, '83100')]} />,
    );

    rerender(
      <PriceChartView
        symbol="BTCUSDT"
        candles={[candle(900_000, '83000'), candle(1_800_000, '83100')]}
      />,
    );

    expect(fake.bars.setData).toHaveBeenCalledTimes(2);
    expect(fake.bars.update).not.toHaveBeenCalled();
  });

  it('캔들을 기다리는 동안과 받지 못했을 때 안내한다', () => {
    const { rerender } = render(
      <PriceChartView symbol="BTCUSDT" candles={undefined} />,
    );
    expect(screen.getByText('차트를 불러오는 중…')).toBeInTheDocument();

    rerender(<PriceChartView symbol="BTCUSDT" candles={undefined} failed />);
    expect(screen.getByText('캔들을 불러오지 못했습니다')).toBeInTheDocument();
  });

  it('화면에서 사라지면 차트를 지운다', () => {
    const { unmount } = render(
      <PriceChartView symbol="BTCUSDT" candles={[candle(60_000, '83100')]} />,
    );

    unmount();

    expect(fake.chart.remove).toHaveBeenCalledOnce();
  });
});
