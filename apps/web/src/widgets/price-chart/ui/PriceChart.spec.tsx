import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTokenStore } from '@/shared/api/token-store';
import { subscribeCandles, unsubscribeCandles } from '@/shared/socket';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';
import { PriceChart } from './PriceChart';

vi.mock('@/shared/socket', () => ({
  subscribeCandles: vi.fn(),
  unsubscribeCandles: vi.fn(),
}));

vi.mock('./PriceChartView', () => ({
  PriceChartView: ({
    symbol,
    candles,
    failed,
    priceLines,
    onOrderPriceChange,
  }: {
    symbol: string;
    candles?: unknown[];
    failed?: boolean;
    priceLines?: { title: string }[];
    onOrderPriceChange?: (id: string, price: string) => Promise<unknown>;
  }) => (
    <>
      <p>
        {symbol} {failed ? '실패' : `봉 ${candles?.length ?? '없음'}`}
      </p>
      <p>가격선: {priceLines?.map((line) => line.title).join(', ')}</p>
      <button
        type="button"
        onClick={() => void onOrderPriceChange?.('order-1', '80000.0')}
      >
        선 끌어 놓기
      </button>
    </>
  ),
}));

const candle = (time: number) => ({
  time,
  open: '83000',
  high: '83500',
  low: '82500',
  close: '83100',
  volume: '10',
});

let requested: string[] = [];

beforeEach(() => {
  vi.clearAllMocks();
  requested = [];
  server.use(
    http.get('/api/markets/:symbol/candles', ({ request }) => {
      const interval = new URL(request.url).searchParams.get('interval') ?? '';
      requested.push(interval);
      return HttpResponse.json(
        interval === '1h' ? [candle(1)] : [candle(1), candle(2)],
      );
    }),
  );
});

describe('PriceChart', () => {
  it('처음에는 15분봉을 받아 그리고, 그 간격을 구독한다', async () => {
    renderWithProviders(<PriceChart symbol="BTCUSDT" />);

    expect(await screen.findByText('BTCUSDT 봉 2')).toBeInTheDocument();
    expect(requested).toEqual(['15m']);
    expect(subscribeCandles).toHaveBeenCalledExactlyOnceWith({
      symbol: 'BTCUSDT',
      interval: '15m',
    });
    expect(screen.getByRole('button', { name: '15분' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('간격을 누르면 그 간격의 캔들을 받아 그리고 구독을 옮긴다', async () => {
    renderWithProviders(<PriceChart symbol="BTCUSDT" />);
    await screen.findByText('BTCUSDT 봉 2');

    await userEvent.click(screen.getByRole('button', { name: '1시간' }));

    expect(await screen.findByText('BTCUSDT 봉 1')).toBeInTheDocument();
    expect(requested).toEqual(['15m', '1h']);
    expect(unsubscribeCandles).toHaveBeenCalledExactlyOnceWith({
      symbol: 'BTCUSDT',
      interval: '15m',
    });
    expect(subscribeCandles).toHaveBeenLastCalledWith({
      symbol: 'BTCUSDT',
      interval: '1h',
    });
    expect(screen.getByRole('button', { name: '1시간' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('다른 간격을 보다가 돌아오면, 그동안 멈춰 있던 캔들을 다시 받는다', async () => {
    renderWithProviders(<PriceChart symbol="BTCUSDT" />);
    await screen.findByText('BTCUSDT 봉 2');

    await userEvent.click(screen.getByRole('button', { name: '1시간' }));
    await screen.findByText('BTCUSDT 봉 1');
    await userEvent.click(screen.getByRole('button', { name: '15분' }));

    await waitFor(() => expect(requested).toEqual(['15m', '1h', '15m']));
  });

  it('로그인하면 내 포지션과 이 종목 대기 주문을 가격선으로 넘긴다', async () => {
    server.use(
      http.get('/api/positions', () =>
        HttpResponse.json([
          {
            symbol: 'BTCUSDT',
            side: 'LONG',
            qty: '0.01',
            entryPrice: '81000',
            leverage: 10,
            isolatedMargin: '81',
            liquidationPrice: '73300',
          },
        ]),
      ),
      http.get('/api/orders', () =>
        HttpResponse.json({
          items: [
            {
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
              createdAt: '2026-10-18T00:00:00.000Z',
              updatedAt: '2026-10-18T00:00:00.000Z',
            },
          ],
          nextCursor: null,
        }),
      ),
    );
    useTokenStore.getState().setAccessToken('token-1');

    renderWithProviders(<PriceChart symbol="BTCUSDT" />);

    expect(
      await screen.findByText('가격선: 진입 롱, 청산, 매수 0.002'),
    ).toBeInTheDocument();
  });

  it('주문 선을 끌어 놓으면 그 주문의 정정을 보낸다', async () => {
    const sent: unknown[] = [];
    server.use(
      http.patch('/api/orders/:id', async ({ params, request }) => {
        sent.push({ id: params.id, body: await request.json() });
        return HttpResponse.json({
          order: {
            id: 'order-1',
            symbol: 'BTCUSDT',
            side: 'BUY',
            type: 'LIMIT',
            status: 'NEW',
            qty: '0.002',
            price: '80000',
            leverage: 10,
            reduceOnly: false,
            reservedMargin: '16.032',
            avgFillPrice: null,
            fee: '0',
            realizedPnl: '0',
            createdAt: '2026-10-19T00:00:00.000Z',
            updatedAt: '2026-10-19T00:00:00.000Z',
          },
          position: null,
        });
      }),
    );
    renderWithProviders(<PriceChart symbol="BTCUSDT" />);

    await userEvent.click(screen.getByRole('button', { name: '선 끌어 놓기' }));

    expect(
      await screen.findByText('주문 가격을 바꿨습니다 (80,000.0)'),
    ).toBeInTheDocument();
    expect(sent).toEqual([{ id: 'order-1', body: { price: '80000.0' } }]);
  });

  it('캔들을 받지 못하면 실패를 알린다', async () => {
    server.use(
      http.get('/api/markets/:symbol/candles', () =>
        HttpResponse.json(
          { statusCode: 503, code: 'MARKET_DATA_UNAVAILABLE', message: 'x' },
          { status: 503 },
        ),
      ),
    );

    renderWithProviders(<PriceChart symbol="ETHUSDT" />);

    expect(await screen.findByText('ETHUSDT 실패')).toBeInTheDocument();
  });
});
