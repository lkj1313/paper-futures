import type {
  AccountPosition,
  PositionLiveValues,
} from '@paper-futures/shared';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { PositionRowView } from './PositionRowView';

const BTC_LONG: AccountPosition = {
  symbol: 'BTCUSDT',
  side: 'LONG',
  qty: '0.01',
  entryPrice: '81000',
  leverage: 10,
  isolatedMargin: '81',
  liquidationPrice: '73300',
};

const PROFIT: PositionLiveValues = {
  markPrice: '81500',
  unrealizedPnl: '5',
  roe: '0.0617',
  stale: false,
};

function renderRow(position: AccountPosition, live: PositionLiveValues) {
  render(
    <MemoryRouter>
      <table>
        <tbody>
          <PositionRowView
            symbol="BTCUSDT"
            position={position}
            live={live}
            closeSlot={<button type="button">닫기 칸</button>}
          />
        </tbody>
      </table>
    </MemoryRouter>,
  );
  return within(screen.getByRole('row'));
}

describe('PositionRowView', () => {
  it('포지션 값을 종목 자리수로 보여 주고, 종목은 그 종목 화면으로 가는 링크다', () => {
    const row = renderRow(BTC_LONG, PROFIT);

    expect(row.getByRole('link', { name: 'BTCUSDT' })).toHaveAttribute(
      'href',
      '/trade/BTCUSDT',
    );
    expect(row.getByText('10x')).toBeInTheDocument();
    expect(row.getByText('0.010 BTC')).toBeInTheDocument();
    expect(row.getByText('81,000.0')).toBeInTheDocument();
    expect(row.getByText('81,500.0')).toBeInTheDocument();
    expect(row.getByText('73,300.0')).toBeInTheDocument();
    expect(row.getByText('81.00')).toBeInTheDocument();
    expect(row.getByRole('button', { name: '닫기 칸' })).toBeInTheDocument();
  });

  it('롱과 이익은 상승색, 숏과 손실은 하락색으로 보여 준다', () => {
    const long = renderRow(BTC_LONG, PROFIT);
    expect(long.getByText('롱')).toHaveClass('text-up');
    expect(long.getByText('+5.00 (+6.17%)')).toHaveClass('text-up');
  });

  it('숏이 손실이면 둘 다 하락색이다', () => {
    const short = renderRow(
      { ...BTC_LONG, side: 'SHORT' },
      { ...PROFIT, unrealizedPnl: '-5', roe: '-0.0617' },
    );
    expect(short.getByText('숏')).toHaveClass('text-down');
    expect(short.getByText('-5.00 (-6.17%)')).toHaveClass('text-down');
  });

  it('마크가격이 없으면 마크가격과 손익을 --로 보여 준다', () => {
    const row = renderRow(BTC_LONG, {
      markPrice: null,
      unrealizedPnl: null,
      roe: null,
      stale: true,
    });

    expect(row.getAllByText('--')).toHaveLength(2);
  });

  it('시세가 늦으면 마크가격과 손익을 흐리게 하고 이유를 알려 준다', () => {
    const row = renderRow(BTC_LONG, { ...PROFIT, stale: true });

    for (const text of ['81,500.0', '+5.00 (+6.17%)']) {
      const cell = row.getByText(text).closest('td');
      expect(cell).toHaveClass('opacity-40');
      expect(cell).toHaveAttribute('title', '시세가 늦게 들어오고 있습니다');
    }
    expect(row.getByText('81,000.0').closest('td')).not.toHaveClass(
      'opacity-40',
    );
  });
});
