import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { LeverageControl, type LeverageControlProps } from './LeverageControl';

function Playground(props: LeverageControlProps) {
  const [value, setValue] = useState(props.value);
  const [saving, setSaving] = useState(false);

  const save = async (leverage: number) => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setValue(leverage);
    setSaving(false);
  };

  return (
    <LeverageControl
      {...props}
      value={value}
      saving={props.saving || saving}
      onConfirm={save}
    />
  );
}

const meta = {
  title: 'features/place-order/LeverageControl',
  component: LeverageControl,
  args: {
    symbol: 'BTCUSDT',
    value: 10,
    onConfirm: async () => undefined,
  },
  render: (args) => <Playground {...args} />,
} satisfies Meta<typeof LeverageControl>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: '기본 (바꾸고 확인)',
};

export const Saving: Story = {
  name: '저장 중',
  args: { saving: true },
};

export const LoggedOut: Story = {
  name: '로그인 전',
  args: { disabledReason: '로그인하면 바꿀 수 있습니다' },
};

export const Locked: Story = {
  name: '포지션이 있어 고정',
  args: { locked: 5 },
};
