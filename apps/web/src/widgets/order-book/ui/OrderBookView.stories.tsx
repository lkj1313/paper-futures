import type {
  MarketTrade,
  MarkPriceInfo,
  OrderBookDepth,
  PriceLevel,
} from '@paper-futures/shared';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { OrderBookView } from './OrderBookView';

const NOW = Date.UTC(2026, 9, 17, 6, 36, 15);

const ladder = (
  start: number,
  step: number,
  digits: number,
  qtys: string[],
): PriceLevel[] =>
  qtys.map((qty, i) => [(start + step * i).toFixed(digits), qty]);

const BTC_ASK_QTYS = [
  '0.106',
  '2.950',
  '0.098',
  '1.204',
  '0.512',
  '0.034',
  '0.870',
  '0.250',
  '0.019',
  '1.100',
];
const BTC_BID_QTYS = [
  '3.411',
  '0.020',
  '1.877',
  '0.300',
  '0.045',
  '0.660',
  '0.120',
  '2.004',
  '0.008',
  '0.415',
];

const depth = (
  bids: PriceLevel[],
  asks: PriceLevel[],
  receivedAt = NOW,
): OrderBookDepth => ({ bids, asks, time: receivedAt, receivedAt });

const newestFirst = (...prices: string[]): MarketTrade[] =>
  prices.map((price, i) => ({
    id: 1000 - i,
    price,
    qty: '0.012',
    side: 'BUY',
    time: NOW,
    receivedAt: NOW,
  }));

const mark = (markPrice: string): MarkPriceInfo => ({
  markPrice,
  indexPrice: markPrice,
  fundingRate: '0.00007200',
  nextFundingTime: NOW,
  time: NOW,
  receivedAt: NOW,
});

const BTC_BOOK = depth(
  ladder(81565.4, -0.1, 1, BTC_BID_QTYS),
  ladder(81565.5, 0.1, 1, BTC_ASK_QTYS),
);

const meta = {
  title: 'widgets/OrderBook',
  component: OrderBookView,
  args: {
    symbol: 'BTCUSDT',
    depth: BTC_BOOK,
    trades: newestFirst('81565.4', '81565.0'),
    mark: mark('81565.10000000'),
    now: NOW,
  },
  decorators: [
    (Story) => (
      <div className="h-[460px] w-[280px] rounded-md bg-card">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof OrderBookView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {
  name: '정상 (현재가 상승)',
};

export const Falling: Story = {
  name: '현재가 하락',
  args: {
    trades: newestFirst('81565.0', '81565.4'),
  },
};

export const Empty: Story = {
  name: '호가 없음',
  args: {
    depth: undefined,
    trades: [],
    mark: undefined,
  },
};

export const BidsOnly: Story = {
  name: '매수 호가만 있음',
  args: {
    depth: depth(BTC_BOOK.bids, []),
  },
};

export const Wall: Story = {
  name: '물량 벽',
  args: {
    depth: depth(
      ladder(81565.4, -0.1, 1, BTC_BID_QTYS),
      ladder(81565.5, 0.1, 1, [
        '0.106',
        '0.250',
        '48.000',
        '0.098',
        '0.512',
        '0.034',
        '0.870',
        '0.250',
        '0.019',
        '1.100',
      ]),
    ),
  },
};

export const Stale: Story = {
  name: '흐림 (호가가 6초째 안 옴)',
  args: {
    depth: depth(BTC_BOOK.bids, BTC_BOOK.asks, NOW - 6000),
  },
};

export const Short: Story = {
  name: '칸이 낮을 때',
  decorators: [
    (Story) => (
      <div className="h-[260px]">
        <Story />
      </div>
    ),
  ],
};

export const Eth: Story = {
  name: 'ETH',
  args: {
    symbol: 'ETHUSDT',
    depth: depth(
      ladder(
        2426.51,
        -0.01,
        2,
        BTC_BID_QTYS.map((q) => String(Number(q) * 40)),
      ),
      ladder(
        2426.52,
        0.01,
        2,
        BTC_ASK_QTYS.map((q) => String(Number(q) * 40)),
      ),
    ),
    trades: newestFirst('2426.52', '2426.60'),
    mark: mark('2426.52000000'),
  },
};
