import type { AccountLedgerEntry } from '@paper-futures/shared';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LedgerTableView, type LedgerTableViewProps } from './LedgerTableView';

const at = new Date(2026, 9, 18, 19, 5, 12).toISOString();

const entry = (
  id: string,
  fields: Partial<AccountLedgerEntry>,
): AccountLedgerEntry => ({
  id,
  type: 'TRADING_FEE',
  amount: '-0.4078255',
  balanceAfter: '9999.5921745',
  createdAt: at,
  ...fields,
});

function renderTable(props: Partial<LedgerTableViewProps> = {}) {
  const onLoadMore = vi.fn();
  render(
    <LedgerTableView
      entries={[]}
      hasMore={false}
      loadingMore={false}
      onLoadMore={onLoadMore}
      {...props}
    />,
  );
  return { onLoadMore };
}

const rowOf = (text: string) => within(screen.getByText(text).closest('tr')!);

describe('LedgerTableView', () => {
  it('기록마다 시간, 종류, 부호 붙은 금액, 변동 후 잔고를 보여 준다', () => {
    renderTable({
      entries: [
        entry('entry-2', { type: 'TRADING_FEE' }),
        entry('entry-1', {
          type: 'SIGNUP_BONUS',
          amount: '10000',
          balanceAfter: '10000',
        }),
      ],
    });

    const fee = rowOf('거래 수수료');
    expect(fee.getByText('10-18 19:05:12')).toBeInTheDocument();
    expect(fee.getByText('-0.41')).toHaveClass('text-down');
    expect(fee.getByText('9,999.59')).toBeInTheDocument();
    expect(rowOf('가입 보너스').getByText('+10,000.00')).toHaveClass('text-up');
  });

  it('종류를 한국어로 보여 준다', () => {
    renderTable({
      entries: [
        entry('entry-1', { type: 'REALIZED_PNL' }),
        entry('entry-2', { type: 'LIQUIDATION' }),
        entry('entry-3', { type: 'FUNDING_FEE' }),
        entry('entry-4', { type: 'DEPOSIT' }),
      ],
    });

    for (const label of ['실현 손익', '강제 청산', '펀딩비', '충전']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('더 있으면 더 보기 버튼을 보여 주고, 누르면 다음을 요청한다', async () => {
    const { onLoadMore } = renderTable({
      entries: [entry('entry-1', {})],
      hasMore: true,
    });

    await userEvent.click(screen.getByRole('button', { name: '더 보기' }));

    expect(onLoadMore).toHaveBeenCalledOnce();
  });

  it('기록이 없으면 그렇다고 알려 준다', () => {
    renderTable({ entries: [] });
    expect(screen.getByText('자산 기록이 없습니다')).toBeInTheDocument();
  });
});
