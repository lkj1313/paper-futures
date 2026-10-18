import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LeverageControl, type LeverageControlProps } from './LeverageControl';

function setup(props: Partial<LeverageControlProps> = {}) {
  const onConfirm = vi.fn(async () => undefined);
  render(
    <LeverageControl
      symbol="BTCUSDT"
      value={10}
      onConfirm={onConfirm}
      {...props}
    />,
  );
  return { onConfirm, user: userEvent.setup() };
}

const open = async (
  user: ReturnType<typeof userEvent.setup>,
  label = '10x',
) => {
  await user.click(screen.getByRole('button', { name: label }));
  await screen.findByText('레버리지 조정');
};

describe('LeverageControl', () => {
  it('버튼에 저장된 레버리지를 보여 주고, 누르면 조절 창이 열린다', async () => {
    const { user } = setup();

    await open(user);

    expect(screen.getByRole('slider', { hidden: true })).toBeInTheDocument();
  });

  it('창에서 바꾸고 확인을 누르면 그 값으로 저장을 요청하고 창을 닫는다', async () => {
    const { onConfirm, user } = setup();
    await open(user);

    await user.click(screen.getByRole('button', { name: '레버리지 높이기' }));
    await user.click(screen.getByRole('button', { name: '확인' }));

    expect(onConfirm).toHaveBeenCalledExactlyOnceWith(11);
    expect(screen.queryByText('레버리지 조정')).not.toBeInTheDocument();
  });

  it('바꾸지 않고 확인하면 요청 없이 닫는다', async () => {
    const { onConfirm, user } = setup();
    await open(user);

    await user.click(screen.getByRole('button', { name: '확인' }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByText('레버리지 조정')).not.toBeInTheDocument();
  });

  it('확인 없이 닫으면 바꾼 값을 버리고, 다시 열면 저장된 값에서 시작한다', async () => {
    const { onConfirm, user } = setup();
    await open(user);
    await user.click(screen.getByRole('button', { name: '레버리지 높이기' }));
    expect(screen.getByText('11x')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await open(user);

    expect(screen.queryByText('11x')).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('저장 중에는 확인을 누를 수 없다', async () => {
    const { user } = setup({ saving: true });
    await open(user);

    expect(screen.getByRole('button', { name: '저장 중…' })).toBeDisabled();
  });

  it('저장할 수 없는 상태면 확인 대신 이유를 보여 준다', async () => {
    const { user } = setup({ disabledReason: '로그인하면 바꿀 수 있습니다' });
    await open(user);

    expect(screen.getByText('로그인하면 바꿀 수 있습니다')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '확인' }),
    ).not.toBeInTheDocument();
  });

  it('포지션이 열려 있으면 그 레버리지로 잠그고 이유를 알려 준다', async () => {
    const { user } = setup({ value: 20, locked: 5 });

    const button = screen.getByRole('button', { name: '5x' });
    expect(button).toBeDisabled();
    expect(
      screen.getByText('BTCUSDT 포지션이 열려 있어 5배로 고정됩니다'),
    ).toBeInTheDocument();

    await user.click(button);
    expect(screen.queryByText('레버리지 조정')).not.toBeInTheDocument();
  });
});
