import type {
  AccountPosition,
  MarketSymbol,
  PositionLiveValues,
} from '@paper-futures/shared';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';
import { ClosePositionControlsView } from '@/features/close-position';
import { toTickPrice } from '@/shared/lib/price';
import { PositionRowView } from './PositionRowView';
import { PositionsTableView } from './PositionsTableView';

const BTC_LONG: AccountPosition = {
  symbol: 'BTCUSDT',
  side: 'LONG',
  qty: '0.01',
  entryPrice: '81000',
  leverage: 10,
  isolatedMargin: '81',
  liquidationPrice: '73300',
};

const ETH_SHORT: AccountPosition = {
  symbol: 'ETHUSDT',
  side: 'SHORT',
  qty: '0.5',
  entryPrice: '2600',
  leverage: 5,
  isolatedMargin: '260',
  liquidationPrice: '3100',
};

const BTC_PROFIT: PositionLiveValues = {
  markPrice: '81500',
  unrealizedPnl: '5',
  roe: '0.0617',
  stale: false,
};

const ETH_LOSS: PositionLiveValues = {
  markPrice: '2650',
  unrealizedPnl: '-25',
  roe: '-0.09615385',
  stale: false,
};

const closeSlot = (
  symbol: MarketSymbol,
  position: AccountPosition,
  live: PositionLiveValues,
) => (
  <ClosePositionControlsView
    price={live.markPrice ? toTickPrice(symbol, live.markPrice) : ''}
    qty={position.qty}
    closing={false}
    onPriceChange={() => undefined}
    onQtyChange={() => undefined}
    onClose={() => undefined}
  />
);

const meta = {
  title: 'widgets/account-tabs/PositionsTable',
  component: PositionsTableView,
  args: { empty: false },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div className="h-[260px] rounded-md bg-card">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof PositionsTableView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Positions: Story = {
  name: '롱 이익, 숏 손실',
  args: {
    children: (
      <>
        <PositionRowView
          symbol="BTCUSDT"
          position={BTC_LONG}
          live={BTC_PROFIT}
          closeSlot={closeSlot('BTCUSDT', BTC_LONG, BTC_PROFIT)}
        />
        <PositionRowView
          symbol="ETHUSDT"
          position={ETH_SHORT}
          live={ETH_LOSS}
          closeSlot={closeSlot('ETHUSDT', ETH_SHORT, ETH_LOSS)}
        />
      </>
    ),
  },
};

export const Stale: Story = {
  name: '시세 늦음',
  args: {
    children: (
      <PositionRowView
        symbol="BTCUSDT"
        position={BTC_LONG}
        live={{ ...BTC_PROFIT, stale: true }}
        closeSlot={closeSlot('BTCUSDT', BTC_LONG, BTC_PROFIT)}
      />
    ),
  },
};

export const Empty: Story = {
  name: '포지션 없음',
  args: { empty: true },
};
