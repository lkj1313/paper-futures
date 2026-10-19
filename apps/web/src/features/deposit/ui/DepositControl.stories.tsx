import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { DepositControl, type DepositControlProps } from './DepositControl';

function Playground(props: DepositControlProps) {
  const [saving, setSaving] = useState(false);

  const confirm = async () => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setSaving(false);
  };

  return <DepositControl saving={props.saving || saving} onConfirm={confirm} />;
}

const meta = {
  title: 'features/deposit/DepositControl',
  component: DepositControl,
  args: { onConfirm: async () => undefined },
  render: (args) => <Playground {...args} />,
} satisfies Meta<typeof DepositControl>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: '기본 (금액 고르고 확인)',
};

export const Saving: Story = {
  name: '충전 중',
  args: { saving: true },
};
