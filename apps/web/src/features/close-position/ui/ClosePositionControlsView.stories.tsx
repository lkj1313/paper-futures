import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
  ClosePositionControlsView,
  type ClosePositionControlsViewProps,
} from './ClosePositionControlsView';

function Playground(props: ClosePositionControlsViewProps) {
  const [price, setPrice] = useState(props.price);
  const [qty, setQty] = useState(props.qty);

  return (
    <ClosePositionControlsView
      {...props}
      price={price}
      qty={qty}
      onPriceChange={setPrice}
      onQtyChange={setQty}
    />
  );
}

const meta = {
  title: 'features/close-position/ClosePositionControls',
  component: ClosePositionControlsView,
  args: {
    price: '81500.0',
    qty: '0.01',
    closing: false,
    onPriceChange: () => undefined,
    onQtyChange: () => undefined,
    onClose: () => undefined,
  },
  render: (args) => <Playground {...args} />,
  decorators: [
    (Story) => (
      <div className="w-fit rounded-md bg-card p-2">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ClosePositionControlsView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: '기본',
};

export const Closing: Story = {
  name: '닫는 중',
  args: { closing: true },
};

export const NoPrice: Story = {
  name: '가격 비어 있음 (지정가 막힘)',
  args: { price: '' },
};
