import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { OrderSummary } from '../lib/order-summary';
import { OrderFormView, type OrderFormViewProps } from './OrderFormView';

const SUMMARY: OrderSummary = {
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

function setup(props: Partial<OrderFormViewProps> = {}) {
  const handlers = {
    onTypeChange: vi.fn(),
    onPriceChange: vi.fn(),
    onQtyChange: vi.fn(),
    onPercent: vi.fn(),
    onReduceOnlyChange: vi.fn(),
    onSubmit: vi.fn(),
  };
  render(
    <MemoryRouter>
      <OrderFormView
        symbol="BTCUSDT"
        type="LIMIT"
        price="81565.0"
        qty="0.01"
        reduceOnly={false}
        available="9918.44"
        summary={SUMMARY}
        loggedIn
        submitting={null}
        {...handlers}
        {...props}
      />
    </MemoryRouter>,
  );
  return { ...handlers, user: userEvent.setup() };
}

describe('OrderFormView', () => {
  it('주문 가능 금액과 매수·매도 각각의 비용·최대 수량을 보여 준다', () => {
    setup();

    expect(screen.getByText('9,918.44 USDT')).toBeInTheDocument();
    expect(screen.getAllByText('비용 81.73 USDT')).toHaveLength(2);
    expect(screen.getAllByText('최대 1.223 BTC')).toHaveLength(2);
  });

  it('포지션을 줄이는 쪽은 비용 대신 포지션 정리라고 보여 준다', () => {
    setup({
      summary: {
        ...SUMMARY,
        SELL: { ...SUMMARY.SELL, reduces: true, cost: null, maxQty: '0.01' },
      },
    });

    expect(screen.getByText('포지션 정리')).toBeInTheDocument();
    expect(screen.getAllByText('비용 81.73 USDT')).toHaveLength(1);
    expect(screen.getByText('최대 0.010 BTC')).toBeInTheDocument();
  });

  it('지정가는 가격 칸이 있고, 시장가는 없다', () => {
    setup();
    expect(screen.getByLabelText('가격')).toHaveValue('81565.0');
  });

  it('시장가는 가격 칸이 없다', () => {
    setup({ type: 'MARKET' });
    expect(screen.queryByLabelText('가격')).not.toBeInTheDocument();
  });

  it('탭을 누르면 주문 유형을 바꾼다', async () => {
    const { onTypeChange, user } = setup();

    await user.click(screen.getByRole('tab', { name: '시장가' }));

    expect(onTypeChange).toHaveBeenCalledWith('MARKET');
  });

  it('가격·수량 입력은 숫자와 점만 넘긴다', () => {
    const { onPriceChange, onQtyChange } = setup();

    fireEvent.change(screen.getByLabelText('가격'), {
      target: { value: '81,565.5' },
    });
    fireEvent.change(screen.getByLabelText('수량'), {
      target: { value: '0.0a1.5' },
    });

    expect(onPriceChange).toHaveBeenCalledWith('81565.5');
    expect(onQtyChange).toHaveBeenCalledWith('0.015');
  });

  it('비율 버튼과 reduceOnly를 누르면 알린다', async () => {
    const { onPercent, onReduceOnlyChange, user } = setup();

    await user.click(screen.getByRole('button', { name: '25%' }));
    await user.click(screen.getByRole('checkbox', { name: /포지션 줄이기만/ }));

    expect(onPercent).toHaveBeenCalledWith(25);
    expect(onReduceOnlyChange).toHaveBeenCalledWith(true);
  });

  it('매수·매도 버튼을 누르면 그 방향으로 주문을 요청한다', async () => {
    const { onSubmit, user } = setup();

    await user.click(screen.getByRole('button', { name: '매수 / 롱' }));
    await user.click(screen.getByRole('button', { name: '매도 / 숏' }));

    expect(onSubmit.mock.calls).toEqual([['BUY'], ['SELL']]);
  });

  it('주문을 보내는 중에는 두 버튼을 막고 누른 쪽에 진행 중을 보여 준다', () => {
    setup({ submitting: 'BUY' });

    expect(screen.getByRole('button', { name: '주문 중…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '매도 / 숏' })).toBeDisabled();
  });

  it('로그인 전에는 주문 버튼 대신 로그인·회원가입으로 안내한다', () => {
    setup({ loggedIn: false, available: undefined });

    expect(
      screen.queryByRole('button', { name: '매수 / 롱' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '로그인' })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(screen.getByRole('link', { name: '회원가입' })).toHaveAttribute(
      'href',
      '/signup',
    );
    expect(screen.getByText('-- USDT')).toBeInTheDocument();
  });
});
