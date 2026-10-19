import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DepositControl } from './DepositControl';

const open = async () => {
  await userEvent.click(screen.getByRole('button', { name: '충전' }));
  return screen.findByLabelText('충전 금액');
};

describe('DepositControl', () => {
  it('금액 버튼을 누르면 그 금액을 채우고, 확인하면 그 금액으로 충전을 요청한 뒤 창을 닫는다', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<DepositControl onConfirm={onConfirm} />);
    const input = await open();

    await userEvent.click(screen.getByRole('button', { name: '10,000' }));
    expect(input).toHaveValue('10000');

    await userEvent.click(screen.getByRole('button', { name: '확인' }));

    expect(onConfirm).toHaveBeenCalledExactlyOnceWith('10000');
    expect(screen.queryByLabelText('충전 금액')).not.toBeInTheDocument();
  });

  it('금액 규칙에 맞지 않으면 이유를 보여 주고 확인을 막는다', async () => {
    render(<DepositControl onConfirm={vi.fn()} />);
    const input = await open();

    expect(screen.getByRole('button', { name: '확인' })).toBeDisabled();

    fireEvent.change(input, { target: { value: '200000' } });

    expect(
      screen.getByText('충전 금액은 0보다 크고 100,000 USDT 이하여야 합니다.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '확인' })).toBeDisabled();
  });

  it('충전이 실패하면 창을 열어 둔다', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('fail'));
    render(<DepositControl onConfirm={onConfirm} />);
    const input = await open();

    fireEvent.change(input, { target: { value: '500' } });
    await userEvent.click(screen.getByRole('button', { name: '확인' }));

    expect(screen.getByLabelText('충전 금액')).toHaveValue('500');
  });

  it('충전 중에는 확인을 막고 진행 중을 보여 준다', async () => {
    render(<DepositControl saving onConfirm={vi.fn()} />);
    const input = await open();
    fireEvent.change(input, { target: { value: '500' } });

    expect(screen.getByRole('button', { name: '충전 중…' })).toBeDisabled();
  });
});
