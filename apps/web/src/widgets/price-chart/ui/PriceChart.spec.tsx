import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  }: {
    symbol: string;
    candles?: unknown[];
    failed?: boolean;
  }) => (
    <p>
      {symbol} {failed ? '실패' : `봉 ${candles?.length ?? '없음'}`}
    </p>
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
