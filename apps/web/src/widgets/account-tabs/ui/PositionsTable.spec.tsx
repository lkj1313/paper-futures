import type { AccountPosition, MarkEvent } from '@paper-futures/shared';
import { act, screen, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { useMarketStore } from '@/entities/market/model/market-store';
import { useTokenStore } from '@/shared/api/token-store';
import { subscribeMarket } from '@/shared/socket';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';
import { PositionsTable } from './PositionsTable';

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

const ETH_SHORT: AccountPosition = {
  symbol: 'ETHUSDT',
  side: 'SHORT',
  qty: '0.5',
  entryPrice: '2600',
  leverage: 5,
  isolatedMargin: '260',
  liquidationPrice: '3100',
};

const mark = (symbol: MarkEvent['symbol'], markPrice: string): MarkEvent => ({
  symbol,
  markPrice,
  indexPrice: markPrice,
  fundingRate: '0.0001',
  nextFundingTime: 0,
  time: Date.now(),
  receivedAt: Date.now(),
});

function loggedInWith(positions: AccountPosition[]) {
  server.use(http.get('/api/positions', () => HttpResponse.json(positions)));
  useTokenStore.getState().setAccessToken('token-1');
}

const renderTable = () =>
  renderWithProviders(
    <MemoryRouter>
      <PositionsTable />
    </MemoryRouter>,
  );

const rowOf = async (symbol: string) =>
  within((await screen.findByRole('link', { name: symbol })).closest('tr')!);

describe('PositionsTable', () => {
  it('포지션마다 그 종목 시세를 구독하고, 마크가격이 바뀌면 손익을 다시 계산한다', async () => {
    loggedInWith([BTC_LONG, ETH_SHORT]);
    useMarketStore.getState().applyMark(mark('BTCUSDT', '81500'));
    useMarketStore.getState().applyMark(mark('ETHUSDT', '2500'));
    renderTable();

    const btc = await rowOf('BTCUSDT');
    const eth = await rowOf('ETHUSDT');
    expect(btc.getByText('+5.00 (+6.17%)')).toBeInTheDocument();
    expect(eth.getByText('+50.00 (+19.23%)')).toBeInTheDocument();
    expect(vi.mocked(subscribeMarket).mock.calls.flat()).toEqual(
      expect.arrayContaining(['BTCUSDT', 'ETHUSDT']),
    );

    act(() => useMarketStore.getState().applyMark(mark('BTCUSDT', '80000')));

    expect(btc.getByText('-10.00 (-12.35%)')).toBeInTheDocument();
  });

  it('줄마다 그 포지션의 닫기 칸이 있다', async () => {
    loggedInWith([BTC_LONG]);
    useMarketStore.getState().applyMark(mark('BTCUSDT', '81500'));
    renderTable();

    const btc = await rowOf('BTCUSDT');

    expect(btc.getByLabelText('닫기 수량')).toHaveValue('0.01');
    expect(btc.getByLabelText('닫기 가격')).toHaveValue('81500.0');
  });

  it('열린 포지션이 없으면 그렇다고 알려 준다', async () => {
    loggedInWith([]);
    renderTable();

    expect(
      await screen.findByText('열린 포지션이 없습니다'),
    ).toBeInTheDocument();
  });
});
