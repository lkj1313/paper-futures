import type { MarketSymbol } from '@paper-futures/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LeverageSlider } from './LeverageSlider';

function setup(symbol: MarketSymbol, value: number) {
  const onChange = vi.fn();
  render(<LeverageSlider symbol={symbol} value={value} onChange={onChange} />);
  return { onChange, user: userEvent.setup() };
}

describe('LeverageSlider', () => {
  it('지금 레버리지와 종목 최대까지의 눈금을 보여 준다', () => {
    setup('BTCUSDT', 10);

    expect(screen.getByText('10x')).toBeInTheDocument();
    for (const mark of ['1x', '25x', '50x', '75x', '100x', '125x']) {
      expect(screen.getByText(mark)).toBeInTheDocument();
    }
  });

  it('ETH는 최대 100배까지만 눈금을 보여 준다', () => {
    setup('ETHUSDT', 10);

    expect(screen.getByText('100x')).toBeInTheDocument();
    expect(screen.queryByText('125x')).not.toBeInTheDocument();
  });

  it('+와 −로 1씩 바꾼다', async () => {
    const { onChange, user } = setup('BTCUSDT', 10);

    await user.click(screen.getByRole('button', { name: '레버리지 높이기' }));
    expect(onChange).toHaveBeenLastCalledWith(11);

    await user.click(screen.getByRole('button', { name: '레버리지 낮추기' }));
    expect(onChange).toHaveBeenLastCalledWith(9);
  });

  it('끝에서는 더 움직이지 않는다', () => {
    setup('BTCUSDT', 125);
    expect(
      screen.getByRole('button', { name: '레버리지 높이기' }),
    ).toBeDisabled();
  });

  it('1배에서는 더 낮출 수 없다', () => {
    setup('BTCUSDT', 1);
    expect(
      screen.getByRole('button', { name: '레버리지 낮추기' }),
    ).toBeDisabled();
  });

  it('슬라이더를 키보드로 움직이면 바꾼다', async () => {
    const { onChange, user } = setup('BTCUSDT', 10);

    screen.getByRole('slider', { hidden: true }).focus();
    await user.keyboard('{ArrowRight}');

    expect(onChange).toHaveBeenLastCalledWith(11);
  });

  it('종목 최대보다 큰 값이 들어오면 최대로 맞춘다', () => {
    const { onChange } = setup('ETHUSDT', 125);

    expect(onChange).toHaveBeenCalledWith(100);
  });
});
