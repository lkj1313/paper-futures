import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ComponentProps, useState } from 'react';
import { LeverageControl } from './LeverageControl';

function Playground(props: ComponentProps<typeof LeverageControl>) {
  const [value, setValue] = useState(props.value);
  return <LeverageControl {...props} value={value} onChange={setValue} />;
}

const meta = {
  title: 'features/place-order/LeverageControl',
  component: LeverageControl,
  args: { symbol: 'BTCUSDT', value: 10, onChange: () => undefined },
  render: (args) => <Playground {...args} />,
} satisfies Meta<typeof LeverageControl>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: '기본 (눌러서 조절)',
};

export const Locked: Story = {
  name: '포지션이 있어 고정',
  args: { locked: 5 },
};
