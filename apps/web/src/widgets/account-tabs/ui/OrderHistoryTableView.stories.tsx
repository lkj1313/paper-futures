import type { AccountOrder } from '@paper-futures/shared';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';
import { OrderHistoryTableView } from './OrderHistoryTableView';

const base: AccountOrder = {
  id: 'order-1',
  symbol: 'BTCUSDT',
  side: 'BUY',
  type: 'MARKET',
  status: 'FILLED',
  qty: '0.01',
  price: null,
  leverage: 10,
  reduceOnly: false,
  reservedMargin: '0',
  avgFillPrice: '81000',
  fee: '0.405',
  realizedPnl: '0',
  createdAt: '2026-10-18T10:00:00.000Z',
  updatedAt: '2026-10-18T10:00:00.000Z',
};

const ORDERS: AccountOrder[] = [
  {
    ...base,
    id: 'order-5',
    type: 'LIQUIDATION',
    side: 'SELL',
    qty: '0.5',
    symbol: 'ETHUSDT',
    avgFillPrice: '3100',
    fee: '0.775',
    realizedPnl: '-250',
    createdAt: '2026-10-18T10:20:00.000Z',
  },
  {
    ...base,
    id: 'order-4',
    type: 'LIMIT',
    status: 'CANCELED',
    side: 'SELL',
    price: '83000',
    avgFillPrice: null,
    fee: '0',
    reduceOnly: true,
    createdAt: '2026-10-18T10:15:00.000Z',
  },
  {
    ...base,
    id: 'order-3',
    side: 'SELL',
    avgFillPrice: '81500',
    fee: '0.4075',
    realizedPnl: '5',
    reduceOnly: true,
    createdAt: '2026-10-18T10:10:00.000Z',
  },
  {
    ...base,
    id: 'order-2',
    type: 'LIMIT',
    status: 'NEW',
    price: '70000',
    qty: '0.002',
    avgFillPrice: null,
    fee: '0',
    createdAt: '2026-10-18T10:05:00.000Z',
  },
  base,
];

const meta = {
  title: 'widgets/account-tabs/OrderHistoryTable',
  component: OrderHistoryTableView,
  args: {
    orders: ORDERS,
    hasMore: true,
    loadingMore: false,
    onLoadMore: () => undefined,
  },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div className="h-[260px] rounded-md bg-card">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof OrderHistoryTableView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const History: Story = {
  name: '주문 내역 (더 있음)',
};

export const LoadingMore: Story = {
  name: '더 불러오는 중',
  args: { loadingMore: true },
};

export const Empty: Story = {
  name: '주문 내역 없음',
  args: { orders: [], hasMore: false },
};
