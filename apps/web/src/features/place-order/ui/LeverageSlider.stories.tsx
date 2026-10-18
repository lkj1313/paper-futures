import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { LeverageSlider, type LeverageSliderProps } from './LeverageSlider';

function Playground(props: LeverageSliderProps) {
  const [value, setValue] = useState(props.value);
  return <LeverageSlider {...props} value={value} onChange={setValue} />;
}

const meta = {
  title: 'features/place-order/LeverageSlider',
  component: LeverageSlider,
  args: { symbol: 'BTCUSDT', value: 10, onChange: () => undefined },
  render: (args) => <Playground {...args} />,
  decorators: [
    (Story) => (
      <div className="w-72 rounded-md bg-popover p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LeverageSlider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Btc: Story = {
  name: 'BTC 10x',
};

export const BtcMax: Story = {
  name: 'BTC 최대 125x',
  args: { value: 125 },
};

export const Eth: Story = {
  name: 'ETH (최대 100x)',
  args: { symbol: 'ETHUSDT' },
};
