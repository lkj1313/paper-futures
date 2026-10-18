import type { AccountOrder, AccountPosition } from '@paper-futures/shared';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { useTokenStore } from '@/shared/api/token-store';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';
import { AccountTabs } from './AccountTabs';

vi.mock('@/shared/socket', () => ({
  subscribeMarket: vi.fn(),
  unsubscribeMarket: vi.fn(),
}));

const BTC_LONG: AccountPosition = {
  symbol: 'BTCUSDT',
  side: 'LONG',
  qty: '0.01',
  entryPrice: '81000',
  leverage: 10,
  isolatedMargin: '81',
  liquidationPrice: '73300',
};

const limitBuy = (id: string): AccountOrder => ({
  id,
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
  createdAt: '2026-10-18T10:05:12.000Z',
  updatedAt: '2026-10-18T10:05:12.000Z',
});

function loggedIn() {
  server.use(
    http.get('/api/positions', () => HttpResponse.json([BTC_LONG])),
    http.get('/api/orders', ({ request }) =>
      HttpResponse.json({
        items:
          new URL(request.url).searchParams.get('status') === 'NEW'
            ? [limitBuy('order-2'), limitBuy('order-1')]
            : [],
        nextCursor: null,
      }),
    ),
    http.get('/api/wallet/ledger', () =>
      HttpResponse.json({
        items: [
          {
            id: 'entry-1',
            type: 'SIGNUP_BONUS',
            amount: '10000',
            balanceAfter: '10000',
            createdAt: '2026-10-18T10:00:00.000Z',
          },
        ],
        nextCursor: null,
      }),
    ),
  );
  useTokenStore.getState().setAccessToken('token-1');
}

const renderTabs = () =>
  renderWithProviders(
    <MemoryRouter>
      <AccountTabs />
    </MemoryRouter>,
  );

describe('AccountTabs', () => {
  it('로그인 전에는 탭 대신 로그인·회원가입으로 안내한다', () => {
    renderTabs();

    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '로그인' })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(screen.getByRole('link', { name: '회원가입' })).toHaveAttribute(
      'href',
      '/signup',
    );
  });

  it('포지션과 대기 주문 탭에 개수를 붙이고, 처음에는 포지션 표를 보여 준다', async () => {
    loggedIn();
    renderTabs();

    expect(
      await screen.findByRole('tab', { name: '포지션 (1)' }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(
      await screen.findByRole('tab', { name: '대기 주문 (2)' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('닫기 수량')).toHaveValue('0.01');
  });

  it('탭을 누르면 그 표로 바뀐다', async () => {
    loggedIn();
    renderTabs();

    await userEvent.click(screen.getByRole('tab', { name: '자산 기록' }));

    expect(await screen.findByText('가입 보너스')).toBeInTheDocument();
    expect(screen.queryByLabelText('닫기 수량')).not.toBeInTheDocument();
  });
});
