import type { Candle } from '@paper-futures/shared';
import { fireEvent, render, screen } from '@testing-library/react';
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
    createPriceLine: vi.fn((options: { title: string }) => ({
      title: options.title,
      applyOptions: vi.fn(),
    })),
    removePriceLine: vi.fn(),
    priceToCoordinate: vi.fn((price: number) => (90000 - price) / 10),
    coordinateToPrice: vi.fn((y: number) => 90000 - y * 10),
  });
  const bars = series();
  const volume = series();
  const chart = {
    addSeries: vi.fn(),
    remove: vi.fn(),
    applyOptions: vi.fn(),
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

  it('가격선을 그리고, 목록이 바뀌면 옛 선을 지우고 새로 그린다', () => {
    const candles = [candle(60_000, '83100')];
    const entry = { price: 81000, title: '진입 롱' };
    const liquidation = { price: 73300, title: '청산' };
    const { rerender } = render(
      <PriceChartView
        symbol="BTCUSDT"
        candles={candles}
        priceLines={[entry, liquidation]}
      />,
    );
    expect(fake.bars.createPriceLine.mock.calls).toEqual([
      [entry],
      [liquidation],
    ]);

    const order = { price: 70000, title: '매수 0.002' };
    rerender(
      <PriceChartView
        symbol="BTCUSDT"
        candles={candles}
        priceLines={[order]}
      />,
    );

    expect(
      fake.bars.removePriceLine.mock.calls.map(([line]) => line.title),
    ).toEqual(['진입 롱', '청산']);
    expect(fake.bars.createPriceLine).toHaveBeenLastCalledWith(order);
  });

  it('가격선 목록이 그대로면 캔들이 바뀌어도 선을 다시 그리지 않는다', () => {
    const lines = [{ price: 81000, title: '진입 롱' }];
    const { rerender } = render(
      <PriceChartView
        symbol="BTCUSDT"
        candles={[candle(60_000, '83100')]}
        priceLines={lines}
      />,
    );

    rerender(
      <PriceChartView
        symbol="BTCUSDT"
        candles={[candle(60_000, '83200')]}
        priceLines={lines}
      />,
    );

    expect(fake.bars.createPriceLine).toHaveBeenCalledOnce();
    expect(fake.bars.removePriceLine).not.toHaveBeenCalled();
  });

  describe('주문 선 끌기', () => {
    const entry = { price: 82000, title: '진입 롱' };
    const order = { id: 'order-1', price: 81000, title: '매수 0.002' };
    const lineTitled = (title: string) =>
      fake.bars.createPriceLine.mock.results.find(
        (result) => result.value.title === title,
      )!.value as { applyOptions: ReturnType<typeof vi.fn> };

    function renderDraggable(onOrderPriceChange = vi.fn()) {
      const view = render(
        <PriceChartView
          symbol="BTCUSDT"
          candles={[candle(60_000, '83100')]}
          priceLines={[entry, order]}
          onOrderPriceChange={onOrderPriceChange}
        />,
      );
      return {
        onOrderPriceChange,
        wrapper: view.container.firstElementChild as HTMLElement,
      };
    }

    it('주문 선을 잡아 끌면 선이 호가 단위로 따라오고, 놓으면 새 가격으로 정정을 요청한다', () => {
      const { onOrderPriceChange, wrapper } = renderDraggable(
        vi.fn().mockResolvedValue(undefined),
      );

      fireEvent.pointerDown(wrapper, { clientY: 902 });
      expect(fake.chart.applyOptions).toHaveBeenLastCalledWith({
        handleScroll: false,
        handleScale: false,
      });

      fireEvent.pointerMove(window, { clientY: 999.673 });
      expect(lineTitled('매수 0.002').applyOptions).toHaveBeenLastCalledWith({
        price: 80003.3,
      });

      fireEvent.pointerUp(window);
      expect(onOrderPriceChange).toHaveBeenCalledExactlyOnceWith(
        'order-1',
        '80003.3',
      );
      expect(fake.chart.applyOptions).toHaveBeenLastCalledWith({
        handleScroll: true,
        handleScale: true,
      });
    });

    it('정정이 실패하면 선을 원래 가격으로 되돌린다', async () => {
      const { wrapper } = renderDraggable(
        vi.fn().mockRejectedValue(new Error('fail')),
      );

      fireEvent.pointerDown(wrapper, { clientY: 900 });
      fireEvent.pointerMove(window, { clientY: 1000 });
      fireEvent.pointerUp(window);
      await Promise.resolve();
      await Promise.resolve();

      expect(lineTitled('매수 0.002').applyOptions).toHaveBeenLastCalledWith({
        price: 81000,
      });
    });

    it('포지션 선은 잡히지 않고, 끌지 않고 놓으면 정정하지 않는다', () => {
      const { onOrderPriceChange, wrapper } = renderDraggable();

      fireEvent.pointerDown(wrapper, { clientY: 800 });
      fireEvent.pointerMove(window, { clientY: 850 });
      fireEvent.pointerUp(window);
      expect(fake.chart.applyOptions).not.toHaveBeenCalled();

      fireEvent.pointerDown(wrapper, { clientY: 900 });
      fireEvent.pointerUp(window);
      expect(onOrderPriceChange).not.toHaveBeenCalled();
    });

    it('끌었다가 원래 가격으로 되돌려 놓으면 정정하지 않는다', () => {
      const { onOrderPriceChange, wrapper } = renderDraggable();

      fireEvent.pointerDown(wrapper, { clientY: 900 });
      fireEvent.pointerMove(window, { clientY: 950 });
      fireEvent.pointerMove(window, { clientY: 900 });
      fireEvent.pointerUp(window);

      expect(onOrderPriceChange).not.toHaveBeenCalled();
    });

    it('주문 선 위에 올리면 위아래 화살표 커서로 바뀐다', () => {
      const { wrapper } = renderDraggable();

      fireEvent.pointerMove(wrapper, { clientY: 903 });
      expect(wrapper.style.cursor).toBe('ns-resize');

      fireEvent.pointerMove(wrapper, { clientY: 800 });
      expect(wrapper.style.cursor).toBe('');
    });
  });

  it('화면에서 사라지면 차트를 지운다', () => {
    const { unmount } = render(
      <PriceChartView symbol="BTCUSDT" candles={[candle(60_000, '83100')]} />,
    );

    unmount();

    expect(fake.chart.remove).toHaveBeenCalledOnce();
  });
});
