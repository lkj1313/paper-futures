import type { AccountOrder } from '@paper-futures/shared';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';
import { Button } from '@/shared/ui/button';
import { OpenOrdersTableView } from './OpenOrdersTableView';

const LIMIT_BUY: AccountOrder = {
  id: 'order-1',
  symbol: 'BTCUSDT',
  side: 'BUY',
  type: 'LIMIT',
  status: 'NEW',
  qty: '0.002',
  price: '70000',
  leverage: 10,
  reduceOnly: false,
  reservedMargin: '14.028',
  avgFillPrice: null,
  fee: '0',
  realizedPnl: '0',
  createdAt: '2026-10-18T10:05:12.000Z',
  updatedAt: '2026-10-18T10:05:12.000Z',
};

const CLOSE_SELL: AccountOrder = {
  ...LIMIT_BUY,
  id: 'order-2',
  side: 'SELL',
  qty: '0.01',
  price: '82000',
  reduceOnly: true,
  reservedMargin: '0',
  createdAt: '2026-10-18T10:07:40.000Z',
};

const ETH_SELL: AccountOrder = {
  ...LIMIT_BUY,
  id: 'order-3',
  symbol: 'ETHUSDT',
  side: 'SELL',
  qty: '0.5',
  price: '2800',
  reservedMargin: '140.28',
  createdAt: '2026-10-18T10:09:03.000Z',
};

const meta = {
  title: 'widgets/account-tabs/OpenOrdersTable',
  component: OpenOrdersTableView,
  args: {
    orders: [ETH_SELL, CLOSE_SELL, LIMIT_BUY],
    renderCancel: () => (
      <Button variant="ghost" size="xs">
        취소
      </Button>
    ),
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
} satisfies Meta<typeof OpenOrdersTableView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Orders: Story = {
  name: '대기 주문 (닫기 주문 포함)',
};

export const Empty: Story = {
  name: '대기 주문 없음',
  args: { orders: [] },
};
