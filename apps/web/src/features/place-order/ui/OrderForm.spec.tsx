import type { AccountOrder, MarketTrade } from '@paper-futures/shared';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http, type JsonBodyType } from 'msw';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { useMarketStore } from '@/entities/market/model/market-store';
import { useTokenStore } from '@/shared/api/token-store';
import { Toaster } from '@/shared/ui/sonner';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';
import { OrderForm } from './OrderForm';

vi.mock('@/shared/socket', () => ({
  subscribeMarket: vi.fn(),
  unsubscribeMarket: vi.fn(),
}));

const trade = (price: string): MarketTrade => ({
  id: 1,
  price,
  qty: '0.001',
  side: 'BUY',
  time: Date.now(),
  receivedAt: Date.now(),
});

const order = (fields: Partial<AccountOrder>): AccountOrder => ({
  id: 'order-1',
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
  createdAt: '2026-10-18T00:00:00.000Z',
  updatedAt: '2026-10-18T00:00:00.000Z',
  ...fields,
});

function loggedInMarket() {
  server.use(
    http.get('/api/wallet', () =>
      HttpResponse.json({
        asset: 'USDT',
        balance: '10000',
        usedMargin: '0',
        openOrderMargin: '0',
        availableBalance: '10000',
      }),
    ),
    http.get('/api/positions', () => HttpResponse.json([])),
    http.get('/api/leverage', () =>
      HttpResponse.json({ BTCUSDT: 10, ETHUSDT: 10 }),
    ),
  );
  useTokenStore.getState().setAccessToken('token-1');
  useMarketStore.getState().applyTrades({
    symbol: 'BTCUSDT',
    trades: [trade('81565.00')],
  });
  useMarketStore.getState().applyDepth({
    symbol: 'BTCUSDT',
    bids: [['81564.9', '1.000']],
    asks: [['81565.1', '1.000']],
    time: Date.now(),
    receivedAt: Date.now(),
  });
}

function capturePost(response: JsonBodyType, status = 201) {
  const sent: unknown[] = [];
  server.use(
    http.post('/api/orders', async ({ request }) => {
      sent.push(await request.json());
      return HttpResponse.json(response, { status });
    }),
  );
  return sent;
}

function renderForm() {
  const client = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
      <Toaster theme="dark" />
    </QueryClientProvider>
  );
  const view = render(<OrderForm symbol="BTCUSDT" />, { wrapper });
  return { user: userEvent.setup(), ...view };
}

const typeQty = (qty: string) =>
  fireEvent.change(screen.getByLabelText('수량'), { target: { value: qty } });

describe('OrderForm', () => {
  it('지정가 가격은 처음에 현재가로 채우고, 지운 뒤에는 다시 채우지 않는다', async () => {
    loggedInMarket();
    renderForm();

    const price = await screen.findByDisplayValue('81565.0');
    fireEvent.change(price, { target: { value: '' } });
    act(() =>
      useMarketStore.getState().applyTrades({
        symbol: 'BTCUSDT',
        trades: [{ ...trade('81566.00'), id: 2 }],
      }),
    );

    expect(screen.getByLabelText('가격')).toHaveValue('');
  });

  it('시장가 매수는 가격 없이 보내고, 체결을 알린 뒤 수량을 비운다', async () => {
    loggedInMarket();
    const sent = capturePost({ order: order({}), position: null });
    const { user } = renderForm();

    await user.click(screen.getByRole('tab', { name: '시장가' }));
    typeQty('0.01');
    await user.click(screen.getByRole('button', { name: '매수 / 롱' }));

    expect(
      await screen.findByText('BTCUSDT 0.010 매수 체결 (평균 81,565.1)'),
    ).toBeInTheDocument();
    expect(sent).toEqual([
      { symbol: 'BTCUSDT', side: 'BUY', type: 'MARKET', qty: '0.01' },
    ]);
    expect(screen.getByLabelText('수량')).toHaveValue('');
  });

  it('지정가는 가격과 reduceOnly를 함께 보내고, 대기 주문을 넣었다고 알린다', async () => {
    loggedInMarket();
    const sent = capturePost({
      order: order({
        side: 'SELL',
        type: 'LIMIT',
        status: 'NEW',
        price: '81565.0',
        reduceOnly: true,
        avgFillPrice: null,
      }),
      position: null,
    });
    const { user } = renderForm();
    await screen.findByDisplayValue('81565.0');

    typeQty('0.01');
    await user.click(screen.getByRole('checkbox', { name: /포지션 줄이기만/ }));
    await user.click(screen.getByRole('button', { name: '매도 / 숏' }));

    expect(
      await screen.findByText('지정가 매도 주문을 넣었습니다 (81,565.0)'),
    ).toBeInTheDocument();
    expect(sent).toEqual([
      {
        symbol: 'BTCUSDT',
        side: 'SELL',
        type: 'LIMIT',
        qty: '0.01',
        price: '81565.0',
        reduceOnly: true,
      },
    ]);
  });

  it('보내기 전 확인에 걸리면 보내지 않고 이유를 알린다', async () => {
    loggedInMarket();
    const sent = capturePost({});
    const { user } = renderForm();
    await screen.findByDisplayValue('81565.0');

    typeQty('0.001');
    await user.click(screen.getByRole('button', { name: '매수 / 롱' }));

    expect(
      await screen.findByText('최소 주문 금액은 100 USDT입니다.'),
    ).toBeInTheDocument();
    expect(sent).toEqual([]);
  });

  it('서버가 거부하면 그 이유를 알린다', async () => {
    loggedInMarket();
    capturePost(
      {
        statusCode: 400,
        code: 'INSUFFICIENT_MARGIN',
        message: '주문 가능 금액이 부족합니다.',
      },
      400,
    );
    const { user } = renderForm();
    await screen.findByDisplayValue('81565.0');

    typeQty('0.01');
    await user.click(screen.getByRole('button', { name: '매수 / 롱' }));

    expect(
      await screen.findByText('주문 가능 금액이 부족합니다.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('수량')).toHaveValue('0.01');
  });

  it('비율 버튼은 늘리는 쪽 최대 수량의 비율을 수량에 넣는다', async () => {
    loggedInMarket();
    const { user } = renderForm();
    await screen.findByText('10,000.00 USDT');
    await screen.findByDisplayValue('81565.0');

    await user.click(screen.getByRole('button', { name: '25%' }));

    expect(screen.getByLabelText('수량')).toHaveValue('0.305');
  });

  it('종목이 바뀌면 입력을 비운다', async () => {
    loggedInMarket();
    const { rerender } = renderForm();
    await screen.findByDisplayValue('81565.0');
    typeQty('0.01');

    rerender(<OrderForm symbol="ETHUSDT" />);

    expect(screen.getByLabelText('수량')).toHaveValue('');
  });
});
