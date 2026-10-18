import type { AccountOrder } from '@paper-futures/shared';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { OpenOrdersTableView } from './OpenOrdersTableView';

const LIMIT_BUY: AccountOrder = {
  id: 'order-1',
  symbol: 'BTCUSDT',
  side: 'BUY',
  type: 'LIMIT',
  status: 'NEW',
  qty: '0.002',
  price: '70000',
  leverage: 10,
  reduceOnly: false,
  reservedMargin: '14.028',
  avgFillPrice: null,
  fee: '0',
  realizedPnl: '0',
  createdAt: new Date(2026, 9, 18, 19, 5, 12).toISOString(),
  updatedAt: new Date(2026, 9, 18, 19, 5, 12).toISOString(),
};

const CLOSE_SELL: AccountOrder = {
  ...LIMIT_BUY,
  id: 'order-2',
  side: 'SELL',
  price: '82000',
  qty: '0.01',
  reduceOnly: true,
  reservedMargin: '0',
};

function renderTable(orders: AccountOrder[] | undefined) {
  render(
    <MemoryRouter>
      <OpenOrdersTableView
        orders={orders}
        renderCancel={(order) => <button type="button">{order.id} 취소</button>}
      />
    </MemoryRouter>,
  );
}

const rowOf = (orderId: string) =>
  within(
    screen.getByRole('button', { name: `${orderId} 취소` }).closest('tr')!,
  );

describe('OpenOrdersTableView', () => {
  it('대기 주문을 시간, 종목, 종류, 방향, 가격, 수량, 묶인 금액과 취소 버튼으로 보여 준다', () => {
    renderTable([LIMIT_BUY]);
    const row = rowOf('order-1');

    expect(row.getByText('10-18 19:05:12')).toBeInTheDocument();
    expect(row.getByRole('link', { name: 'BTCUSDT' })).toHaveAttribute(
      'href',
      '/trade/BTCUSDT',
    );
    expect(row.getByText('지정가')).toBeInTheDocument();
    expect(row.getByText('매수')).toHaveClass('text-up');
    expect(row.getByText('70,000.0')).toBeInTheDocument();
    expect(row.getByText('0.002 BTC')).toBeInTheDocument();
    expect(row.getByText('14.03')).toBeInTheDocument();
  });

  it('reduceOnly 주문은 닫기 주문으로 표시하고, 묶인 금액이 없다', () => {
    renderTable([CLOSE_SELL]);
    const row = rowOf('order-2');

    expect(row.getByText('지정가 · 닫기')).toBeInTheDocument();
    expect(row.getByText('매도')).toHaveClass('text-down');
    expect(row.getByText('--')).toBeInTheDocument();
  });

  it('대기 주문이 없으면 그렇다고 알려 주고, 아직 못 받았으면 아무것도 알리지 않는다', () => {
    const { rerender } = render(
      <MemoryRouter>
        <OpenOrdersTableView orders={[]} />
      </MemoryRouter>,
    );
    expect(screen.getByText('대기 중인 주문이 없습니다')).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <OpenOrdersTableView orders={undefined} />
      </MemoryRouter>,
    );
    expect(
      screen.queryByText('대기 중인 주문이 없습니다'),
    ).not.toBeInTheDocument();
  });
});
