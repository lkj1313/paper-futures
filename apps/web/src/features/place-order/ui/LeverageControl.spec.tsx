import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LeverageControl } from './LeverageControl';

describe('LeverageControl', () => {
  it('버튼에 지금 레버리지를 보여 주고, 누르면 조절 창이 열린다', async () => {
    const user = userEvent.setup();
    render(<LeverageControl symbol="BTCUSDT" value={10} onChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: '10x' }));

    expect(await screen.findByText('레버리지 조정')).toBeInTheDocument();
    expect(screen.getByRole('slider', { hidden: true })).toBeInTheDocument();
  });

  it('포지션이 열려 있으면 그 레버리지로 잠그고 이유를 알려 준다', async () => {
    const user = userEvent.setup();
    render(
      <LeverageControl
        symbol="BTCUSDT"
        value={20}
        onChange={vi.fn()}
        locked={5}
      />,
    );

    const button = screen.getByRole('button', { name: '5x' });
    expect(button).toBeDisabled();
    expect(
      screen.getByText('BTCUSDT 포지션이 열려 있어 5배로 고정됩니다'),
    ).toBeInTheDocument();

    await user.click(button);
    expect(screen.queryByText('레버리지 조정')).not.toBeInTheDocument();
  });
});
