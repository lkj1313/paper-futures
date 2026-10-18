import type { AccountOrder } from '@paper-futures/shared';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import {
  OrderHistoryTableView,
  type OrderHistoryTableViewProps,
} from './OrderHistoryTableView';

const at = new Date(2026, 9, 18, 19, 5, 12).toISOString();

const order = (id: string, fields: Partial<AccountOrder>): AccountOrder => ({
  id,
  symbol: 'BTCUSDT',
  side: 'BUY',
  type: 'MARKET',
  status: 'FILLED',
  qty: '0.01',
  price: null,
  leverage: 10,
  reduceOnly: false,
  reservedMargin: '0',
  avgFillPrice: '81565.1',
  fee: '0.4078255',
  realizedPnl: '0',
  createdAt: at,
  updatedAt: at,
  ...fields,
});

function renderTable(props: Partial<OrderHistoryTableViewProps> = {}) {
  const onLoadMore = vi.fn();
  render(
    <MemoryRouter>
      <OrderHistoryTableView
        orders={[]}
        hasMore={false}
        loadingMore={false}
        onLoadMore={onLoadMore}
        {...props}
      />
    </MemoryRouter>,
  );
  return { onLoadMore };
}

const rowOf = (text: string) => within(screen.getByText(text).closest('tr')!);

describe('OrderHistoryTableView', () => {
  it('체결된 시장가 주문을 평균 체결가, 수수료, 실현 손익, 상태와 함께 보여 준다', () => {
    renderTable({
      orders: [order('order-1', { side: 'SELL', realizedPnl: '5' })],
    });
    const row = rowOf('81,565.1');

    expect(row.getByText('10-18 19:05:12')).toBeInTheDocument();
    expect(row.getByRole('link', { name: 'BTCUSDT' })).toBeInTheDocument();
    expect(row.getByText('시장가')).toBeInTheDocument();
    expect(row.getByText('매도')).toHaveClass('text-down');
    expect(row.getByText('--')).toBeInTheDocument();
    expect(row.getByText('0.010 BTC')).toBeInTheDocument();
    expect(row.getByText('0.41')).toBeInTheDocument();
    expect(row.getByText('+5.00')).toHaveClass('text-up');
    expect(row.getByText('체결')).toBeInTheDocument();
  });

  it('주문 종류와 상태를 한국어로 보여 주고, 닫기 주문은 따로 표시한다', () => {
    renderTable({
      orders: [
        order('order-1', {
          type: 'LIMIT',
          status: 'CANCELED',
          price: '82000',
          avgFillPrice: null,
          reduceOnly: true,
        }),
        order('order-2', { type: 'LIQUIDATION', avgFillPrice: '73300' }),
        order('order-3', { type: 'LIMIT', status: 'EXPIRED', price: '83000' }),
        order('order-4', { type: 'LIMIT', status: 'NEW', price: '70000' }),
      ],
    });

    const canceled = rowOf('82,000.0');
    expect(canceled.getByText('지정가 · 닫기')).toBeInTheDocument();
    expect(canceled.getByText('취소')).toBeInTheDocument();
    expect(rowOf('73,300.0').getByText('청산')).toBeInTheDocument();
    expect(rowOf('83,000.0').getByText('만료')).toBeInTheDocument();
    expect(rowOf('70,000.0').getByText('대기')).toBeInTheDocument();
  });

  it('더 있으면 더 보기 버튼을 보여 주고, 누르면 다음을 요청한다', async () => {
    const { onLoadMore } = renderTable({
      orders: [order('order-1', {})],
      hasMore: true,
    });

    await userEvent.click(screen.getByRole('button', { name: '더 보기' }));

    expect(onLoadMore).toHaveBeenCalledOnce();
  });

  it('다음을 받는 중에는 버튼을 막는다', () => {
    renderTable({
      orders: [order('order-1', {})],
      hasMore: true,
      loadingMore: true,
    });
    expect(screen.getByRole('button', { name: '불러오는 중…' })).toBeDisabled();
  });

  it('더 없으면 더 보기 버튼이 없다', () => {
    renderTable({ orders: [order('order-1', {})], hasMore: false });
    expect(
      screen.queryByRole('button', { name: '더 보기' }),
    ).not.toBeInTheDocument();
  });

  it('주문이 없으면 그렇다고 알려 준다', () => {
    renderTable({ orders: [] });
    expect(screen.getByText('주문 내역이 없습니다')).toBeInTheDocument();
  });
});
