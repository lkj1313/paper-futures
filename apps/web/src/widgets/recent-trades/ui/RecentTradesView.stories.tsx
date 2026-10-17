import type { MarketTrade } from '@paper-futures/shared';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { RecentTradesView } from './RecentTradesView';

const START = new Date(2026, 9, 17, 14, 20, 0).getTime();

const tape = (
  rows: [price: string, qty: string, side: MarketTrade['side']][],
  msBetween: number,
): MarketTrade[] =>
  rows.map(([price, qty, side], i) => {
    const time = START - i * msBetween;
    return { id: 10_000 - i, price, qty, side, time, receivedAt: time };
  });

const BTC_TAPE: [string, string, MarketTrade['side']][] = [
  ['81549.9', '0.012', 'SELL'],
  ['81550.0', '0.300', 'BUY'],
  ['81550.0', '1.204', 'BUY'],
  ['81549.8', '0.003', 'SELL'],
  ['81549.8', '0.051', 'SELL'],
  ['81549.9', '0.420', 'BUY'],
  ['81550.1', '2.000', 'BUY'],
  ['81550.0', '0.008', 'SELL'],
  ['81549.7', '0.150', 'SELL'],
  ['81549.6', '0.019', 'SELL'],
  ['81549.8', '0.700', 'BUY'],
  ['81549.9', '0.044', 'BUY'],
];

const meta = {
  title: 'widgets/RecentTrades',
  component: RecentTradesView,
  args: {
    symbol: 'BTCUSDT',
    trades: tape(BTC_TAPE, 700),
  },
  decorators: [
    (Story) => (
      <div className="h-[460px] w-[280px] rounded-md bg-card">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RecentTradesView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mixed: Story = {
  name: '매수·매도 섞임',
};

export const SameSecond: Story = {
  name: '같은 시각 여러 건',
  args: {
    trades: tape(BTC_TAPE, 0),
  },
};

export const Full: Story = {
  name: '50건 (스크롤)',
  args: {
    trades: tape(
      Array.from({ length: 50 }, (_, i) => BTC_TAPE[i % BTC_TAPE.length]),
      400,
    ),
  },
};

export const Empty: Story = {
  name: '체결 없음',
  args: {
    trades: [],
  },
};

export const Eth: Story = {
  name: 'ETH',
  args: {
    symbol: 'ETHUSDT',
    trades: tape(
      [
        ['2426.52', '1.200', 'BUY'],
        ['2426.51', '12.000', 'SELL'],
        ['2426.51', '0.350', 'SELL'],
        ['2426.53', '4.000', 'BUY'],
      ],
      900,
    ),
  },
};
