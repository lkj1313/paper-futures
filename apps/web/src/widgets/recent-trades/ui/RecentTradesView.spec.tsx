import type { MarketTrade } from '@paper-futures/shared';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RecentTradesView } from './RecentTradesView';

const at = (h: number, m: number, s: number) =>
  new Date(2026, 9, 17, h, m, s).getTime();

const trade = (
  id: number,
  price: string,
  qty: string,
  side: MarketTrade['side'],
  time: number,
): MarketTrade => ({ id, price, qty, side, time, receivedAt: time });

const TRADES = [
  trade(3, '81549.9', '0.012', 'SELL', at(14, 20, 1)),
  trade(2, '81550.0', '0.3', 'BUY', at(14, 20, 1)),
  trade(1, '81550.0', '1.204', 'BUY', at(9, 5, 0)),
];

const rows = () =>
  within(screen.getByRole('list', { name: '최근 체결' }))
    .queryAllByRole('listitem')
    .map((row) => row.textContent);

describe('RecentTradesView', () => {
  it('최신 체결을 맨 위에 가격·수량·시간으로 보여 준다', () => {
    render(<RecentTradesView symbol="BTCUSDT" trades={TRADES} />);

    expect(rows()).toEqual([
      '81,549.90.01214:20:01',
      '81,550.00.30014:20:01',
      '81,550.01.20409:05:00',
    ]);
  });

  it('시장가 매수 체결은 초록, 매도 체결은 빨강 가격으로 보여 준다', () => {
    render(<RecentTradesView symbol="BTCUSDT" trades={TRADES} />);

    expect(screen.getByText('81,549.9')).toHaveClass('text-down');
    expect(screen.getAllByText('81,550.0')[0]).toHaveClass('text-up');
  });

  it('종목에 맞춰 단위와 자릿수를 바꾼다', () => {
    render(
      <RecentTradesView
        symbol="ETHUSDT"
        trades={[trade(1, '2426.5', '12.5', 'BUY', at(14, 0, 0))]}
      />,
    );

    expect(screen.getByText('수량(ETH)')).toBeInTheDocument();
    expect(rows()).toEqual(['2,426.5012.50014:00:00']);
  });

  it('체결이 없으면 안내 문구를 보여 준다', () => {
    render(<RecentTradesView symbol="BTCUSDT" trades={[]} />);

    expect(rows()).toEqual([]);
    expect(screen.getByText('아직 체결이 없습니다')).toBeInTheDocument();
  });
});
