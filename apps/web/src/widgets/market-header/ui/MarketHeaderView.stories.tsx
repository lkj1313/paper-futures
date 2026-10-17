import type {
  MarketTrade,
  MarkPriceInfo,
  Ticker24h,
} from '@paper-futures/shared';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MarketHeaderView } from './MarketHeaderView';

const NOW = Date.UTC(2026, 9, 17, 6, 36, 15);
const NEXT_FUNDING = Date.UTC(2026, 9, 17, 8, 0, 0);

const newestFirst = (...prices: string[]): MarketTrade[] =>
  prices.map((price, i) => ({
    id: 1000 - i,
    price,
    qty: '0.012',
    side: 'BUY',
    time: NOW,
    receivedAt: NOW,
  }));

const mark = (markPrice: string, indexPrice: string): MarkPriceInfo => ({
  markPrice,
  indexPrice,
  fundingRate: '0.00007200',
  nextFundingTime: NEXT_FUNDING,
  time: NOW,
  receivedAt: NOW,
});

const ticker = (fields: Partial<Ticker24h>): Ticker24h => ({
  lastPrice: '81565.0',
  priceChange: '845.30',
  priceChangePercent: '1.047',
  openPrice: '80719.70',
  highPrice: '82900.50',
  lowPrice: '80780.00',
  volume: '125120.219',
  quoteVolume: '10230000000.00',
  time: NOW,
  receivedAt: NOW,
  ...fields,
});

const meta = {
  title: 'widgets/MarketHeader',
  component: MarketHeaderView,
  args: {
    symbol: 'BTCUSDT',
    trades: [],
    now: NOW,
  },
} satisfies Meta<typeof MarketHeaderView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  name: '데이터 없음',
};

export const Rising: Story = {
  name: '상승',
  args: {
    trades: newestFirst('81565.4', '81565.4', '81565.0'),
    mark: mark('81565.10000000', '81607.40000000'),
    ticker: ticker({}),
  },
};

export const Falling: Story = {
  name: '하락',
  args: {
    trades: newestFirst('81564.8', '81565.0'),
    mark: mark('81564.90000000', '81607.40000000'),
    ticker: ticker({ priceChange: '-599.30', priceChangePercent: '-0.729' }),
  },
};

export const Stale: Story = {
  name: '흐림 (마크가격이 10초째 안 옴)',
  args: {
    ...Rising.args,
    mark: {
      ...mark('81565.10000000', '81607.40000000'),
      receivedAt: NOW - 10_000,
    },
  },
};

export const Eth: Story = {
  name: 'ETH',
  args: {
    symbol: 'ETHUSDT',
    trades: newestFirst('2426.52', '2426.60'),
    mark: mark('2426.52000000', '2427.81000000'),
    ticker: ticker({
      lastPrice: '2426.52',
      priceChange: '-19.40',
      priceChangePercent: '-0.793',
      highPrice: '2493.48',
      lowPrice: '2392.14',
      volume: '3266335.337',
      quoteVolume: '7970000000.00',
    }),
  },
};

export const Narrow: Story = {
  name: '좁은 화면',
  args: Rising.args,
  decorators: [
    (Story) => (
      <div style={{ width: 480 }}>
        <Story />
      </div>
    ),
  ],
};
