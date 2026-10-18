import type { AccountLedgerEntry } from '@paper-futures/shared';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { LedgerTableView } from './LedgerTableView';

const ENTRIES: AccountLedgerEntry[] = [
  {
    id: 'entry-5',
    type: 'FUNDING_FEE',
    amount: '-0.0815',
    balanceAfter: '10004.0110',
    createdAt: '2026-10-18T16:00:00.000Z',
  },
  {
    id: 'entry-4',
    type: 'REALIZED_PNL',
    amount: '5',
    balanceAfter: '10004.0925',
    createdAt: '2026-10-18T10:10:00.000Z',
  },
  {
    id: 'entry-3',
    type: 'TRADING_FEE',
    amount: '-0.4075',
    balanceAfter: '9999.0925',
    createdAt: '2026-10-18T10:10:00.000Z',
  },
  {
    id: 'entry-2',
    type: 'TRADING_FEE',
    amount: '-0.405',
    balanceAfter: '9999.5',
    createdAt: '2026-10-18T10:00:00.000Z',
  },
  {
    id: 'entry-1',
    type: 'SIGNUP_BONUS',
    amount: '10000',
    balanceAfter: '10000',
    createdAt: '2026-10-18T09:00:00.000Z',
  },
];

const meta = {
  title: 'widgets/account-tabs/LedgerTable',
  component: LedgerTableView,
  args: {
    entries: ENTRIES,
    hasMore: false,
    loadingMore: false,
    onLoadMore: () => undefined,
  },
  decorators: [
    (Story) => (
      <div className="h-[260px] rounded-md bg-card">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LedgerTableView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ledger: Story = {
  name: '자산 기록',
};

export const Empty: Story = {
  name: '자산 기록 없음',
  args: { entries: [] },
};
