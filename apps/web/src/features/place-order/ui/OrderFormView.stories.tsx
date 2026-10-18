import type { PlaceableOrderType } from '@paper-futures/shared';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { MemoryRouter } from 'react-router';
import type { OrderSummary } from '../lib/order-summary';
import { LeverageControl } from './LeverageControl';
import { OrderFormView, type OrderFormViewProps } from './OrderFormView';

const OPEN_BOTH: OrderSummary = {
  BUY: {
    referencePrice: '81565.0',
    reduces: false,
    cost: '81.72813',
    maxQty: '1.223',
  },
  SELL: {
    referencePrice: '81565.0',
    reduces: false,
    cost: '81.72813',
    maxQty: '1.223',
  },
  openingSide: 'BUY',
  leverage: 10,
};

function Playground(props: OrderFormViewProps) {
  const [type, setType] = useState<PlaceableOrderType>(props.type);
  const [price, setPrice] = useState(props.price);
  const [qty, setQty] = useState(props.qty);
  const [reduceOnly, setReduceOnly] = useState(props.reduceOnly);

  return (
    <OrderFormView
      {...props}
      type={type}
      price={price}
      qty={qty}
      reduceOnly={reduceOnly}
      onTypeChange={setType}
      onPriceChange={setPrice}
      onQtyChange={setQty}
      onReduceOnlyChange={setReduceOnly}
      onPercent={(percent) => setQty((1.223 * percent * 0.01).toFixed(3))}
    />
  );
}

const meta = {
  title: 'features/place-order/OrderForm',
  component: OrderFormView,
  args: {
    symbol: 'BTCUSDT',
    type: 'LIMIT',
    price: '81565.0',
    qty: '0.010',
    reduceOnly: false,
    available: '9918.44',
    summary: OPEN_BOTH,
    loggedIn: true,
    submitting: null,
    leverageSlot: (
      <LeverageControl
        symbol="BTCUSDT"
        value={10}
        onConfirm={async () => undefined}
      />
    ),
    onTypeChange: () => undefined,
    onPriceChange: () => undefined,
    onQtyChange: () => undefined,
    onPercent: () => undefined,
    onReduceOnlyChange: () => undefined,
    onSubmit: () => undefined,
  },
  render: (args) => <Playground {...args} />,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div className="w-[320px] rounded-md bg-card">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof OrderFormView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Limit: Story = {
  name: '지정가',
};

export const Market: Story = {
  name: '시장가',
  args: { type: 'MARKET' },
};

export const HoldingLong: Story = {
  name: '롱 보유 중 (매도는 포지션 정리)',
  args: {
    summary: {
      ...OPEN_BOTH,
      SELL: { ...OPEN_BOTH.SELL, reduces: true, cost: null, maxQty: '0.01' },
      leverage: 10,
    },
    leverageSlot: (
      <LeverageControl
        symbol="BTCUSDT"
        value={10}
        locked={10}
        onConfirm={async () => undefined}
      />
    ),
  },
};

export const Submitting: Story = {
  name: '매수 주문 중',
  args: { submitting: 'BUY' },
};

export const LoggedOut: Story = {
  name: '로그인 전',
  args: {
    loggedIn: false,
    available: undefined,
    leverageSlot: (
      <LeverageControl
        symbol="BTCUSDT"
        value={10}
        disabledReason="로그인하면 바꿀 수 있습니다"
        onConfirm={async () => undefined}
      />
    ),
  },
};
