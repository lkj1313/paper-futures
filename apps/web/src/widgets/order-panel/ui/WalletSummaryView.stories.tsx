import type { Meta, StoryObj } from '@storybook/react-vite';
import { DepositControl } from '@/features/deposit';
import { WalletSummaryView } from './WalletSummaryView';

const meta = {
  title: 'widgets/WalletSummary',
  component: WalletSummaryView,
  decorators: [
    (Story) => (
      <div className="w-[320px] rounded-md bg-card">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WalletSummaryView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithPosition: Story = {
  name: '포지션과 대기 주문이 있을 때',
  args: {
    wallet: {
      asset: 'USDT',
      balance: '9995.849975',
      usedMargin: '81.565',
      openOrderMargin: '10.02',
      availableBalance: '9904.264975',
    },
  },
};

export const WithDeposit: Story = {
  name: '충전 버튼',
  args: {
    wallet: {
      asset: 'USDT',
      balance: '10000',
      usedMargin: '0',
      openOrderMargin: '0',
      availableBalance: '10000',
    },
    action: <DepositControl onConfirm={async () => undefined} />,
  },
};

export const LoggedOut: Story = {
  name: '로그인 전',
  args: { wallet: undefined },
};
