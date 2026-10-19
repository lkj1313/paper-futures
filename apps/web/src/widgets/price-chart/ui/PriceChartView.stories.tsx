import type { Candle } from '@paper-futures/shared';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { PriceChartView } from './PriceChartView';

function randomWalk(start: number, step: number, count: number): Candle[] {
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const end = Date.UTC(2026, 9, 19, 3, 0);
  let close = start;
  return Array.from({ length: count }, (_, i) => {
    const open = close;
    close = open + (random() - 0.5) * step;
    const high = Math.max(open, close) + random() * step * 0.4;
    const low = Math.min(open, close) - random() * step * 0.4;
    return {
      time: end - (count - 1 - i) * 15 * 60_000,
      open: open.toFixed(1),
      high: high.toFixed(1),
      low: low.toFixed(1),
      close: close.toFixed(1),
      volume: (200 + random() * 800).toFixed(3),
    };
  });
}

const meta = {
  title: 'widgets/price-chart/PriceChart',
  component: PriceChartView,
  args: {
    symbol: 'BTCUSDT',
    candles: randomWalk(82000, 180, 200),
  },
  decorators: [
    (Story) => (
      <div className="h-[420px] rounded-md bg-card">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PriceChartView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Btc: Story = {
  name: 'BTC 15분봉',
};

export const Eth: Story = {
  name: 'ETH (소수 둘째 자리)',
  args: {
    symbol: 'ETHUSDT',
    candles: randomWalk(2420, 6, 200).map((c) => ({
      ...c,
      open: Number(c.open).toFixed(2),
      high: Number(c.high).toFixed(2),
      low: Number(c.low).toFixed(2),
      close: Number(c.close).toFixed(2),
    })),
  },
};

export const Loading: Story = {
  name: '불러오는 중',
  args: { candles: undefined },
};

export const Failed: Story = {
  name: '받지 못함',
  args: { candles: undefined, failed: true },
};
