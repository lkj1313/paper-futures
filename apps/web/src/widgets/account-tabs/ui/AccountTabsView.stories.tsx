import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';
import { AccountTabsView } from './AccountTabsView';

const panel = (label: string) => (
  <p className="p-3 text-xs text-muted-foreground">{label} 표 자리</p>
);

const meta = {
  title: 'widgets/account-tabs/AccountTabs',
  component: AccountTabsView,
  args: {
    loggedIn: true,
    positionCount: 1,
    openOrderCount: 2,
    positions: panel('포지션'),
    openOrders: panel('대기 주문'),
    history: panel('주문 내역'),
    ledger: panel('자산 기록'),
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
} satisfies Meta<typeof AccountTabsView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LoggedIn: Story = {
  name: '로그인 (개수 표시)',
};

export const Loading: Story = {
  name: '개수를 아직 못 받음',
  args: { positionCount: undefined, openOrderCount: undefined },
};

export const LoggedOut: Story = {
  name: '로그인 전',
  args: { loggedIn: false },
};
