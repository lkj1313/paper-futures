import type {
  MarketTrade,
  MarkPriceInfo,
  OrderBookDepth,
  PriceLevel,
} from '@paper-futures/shared';
import { act, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakeResizeObserver } from '@/test/resize-observer';
import { OrderBookView, type OrderBookViewProps } from './OrderBookView';

const NOW = Date.UTC(2026, 9, 17, 0, 0, 0);
const STALE_TITLE = '호가가 늦게 들어오고 있습니다';

const depth = (
  bids: PriceLevel[],
  asks: PriceLevel[],
  receivedAt = NOW,
): OrderBookDepth => ({ bids, asks, time: receivedAt, receivedAt });

const newestFirst = (...prices: string[]): MarketTrade[] =>
  prices.map((price, i) => ({
    id: 100 - i,
    price,
    qty: '0.001',
    side: 'BUY',
    time: NOW,
    receivedAt: NOW,
  }));

const mark: MarkPriceInfo = {
  markPrice: '81565.10000000',
  indexPrice: '81607.40000000',
  fundingRate: '0.00007200',
  nextFundingTime: NOW,
  time: NOW,
  receivedAt: NOW,
};

const BOOK = depth(
  [
    ['81565.4', '3.411'],
    ['81565.3', '0.020'],
    ['81565.0', '1.877'],
  ],
  [
    ['81565.5', '0.106'],
    ['81565.6', '2.950'],
    ['81565.9', '0.098'],
  ],
);

const ladder = (start: number, step: number): PriceLevel[] =>
  Array.from({ length: 20 }, (_, i) => [
    (start + step * i).toFixed(1),
    '1.000',
  ]);

const FULL_BOOK = depth(ladder(81565.4, -0.1), ladder(81565.5, 0.1));

afterEach(() => {
  vi.unstubAllGlobals();
  FakeResizeObserver.last = undefined;
});

function renderView(props: Partial<OrderBookViewProps> = {}) {
  render(
    <OrderBookView
      symbol="BTCUSDT"
      depth={BOOK}
      trades={newestFirst('81565.4', '81565.0')}
      mark={mark}
      now={NOW}
      {...props}
    />,
  );
}

const rowsOf = (name: string) =>
  within(screen.getByRole('list', { name }))
    .queryAllByRole('listitem')
    .map((row) => row.textContent);

describe('OrderBookView', () => {
  it('매도와 매수 모두 비싼 가격을 위에 그린다', () => {
    renderView();

    expect(rowsOf('매도 호가')).toEqual([
      '81,565.90.0983.154',
      '81,565.62.9503.056',
      '81,565.50.1060.106',
    ]);
    expect(rowsOf('매수 호가')).toEqual([
      '81,565.43.4113.411',
      '81,565.30.0203.431',
      '81,565.01.8775.308',
    ]);
  });

  it('매도는 빨강, 매수는 초록 가격으로 그린다', () => {
    renderView();

    expect(screen.getByText('81,565.9')).toHaveClass('text-down');
    expect(screen.getByText('81,565.3')).toHaveClass('text-up');
  });

  it('가운데에 현재가를 오름·내림 색으로, 옆에 마크가격을 보여 준다', () => {
    renderView();

    expect(screen.getByLabelText('현재가')).toHaveTextContent('81,565.4');
    expect(screen.getByLabelText('현재가')).toHaveClass('text-up');
    expect(screen.getByLabelText('마크가격')).toHaveTextContent('81,565.1');
  });

  it('아래에 매수·매도 물량 비율을 보여 준다', () => {
    renderView();

    expect(screen.getByLabelText('매수·매도 비율')).toHaveTextContent(
      'B 63%37% S',
    );
  });

  it('칸 높이를 아직 모르면 각 쪽 10단계를 그린다', () => {
    renderView({ depth: FULL_BOOK });

    expect(rowsOf('매도 호가')).toHaveLength(10);
    expect(rowsOf('매수 호가')).toHaveLength(10);
  });

  it('칸 높이에 온전히 들어가는 줄 수만큼 그린다', () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    renderView({ depth: FULL_BOOK });

    act(() => FakeResizeObserver.last?.resize(110));
    expect(rowsOf('매도 호가')).toHaveLength(5);
    expect(rowsOf('매수 호가')).toHaveLength(5);

    act(() => FakeResizeObserver.last?.resize(300));
    expect(rowsOf('매도 호가')).toHaveLength(15);
    expect(rowsOf('매수 호가')).toHaveLength(15);
  });

  it('칸이 아주 높아도 받은 20단계까지만 그린다', () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    renderView({ depth: FULL_BOOK });

    act(() => FakeResizeObserver.last?.resize(2000));

    expect(rowsOf('매도 호가')).toHaveLength(20);
    expect(rowsOf('매수 호가')).toHaveLength(20);
  });

  it('호가를 받기 전에는 비워 두고 현재가와 마크가격은 --', () => {
    renderView({ depth: undefined, trades: [], mark: undefined });

    expect(rowsOf('매도 호가')).toEqual([]);
    expect(rowsOf('매수 호가')).toEqual([]);
    expect(screen.getByLabelText('현재가')).toHaveTextContent('--');
    expect(screen.getByLabelText('마크가격')).toHaveTextContent('--');
    expect(screen.getByLabelText('매수·매도 비율')).toHaveTextContent(
      'B --%--% S',
    );
  });

  it('호가를 받은 지 5초가 넘으면 흐리게 보여 준다', () => {
    renderView({ depth: depth(BOOK.bids, BOOK.asks, NOW - 6000) });

    expect(screen.getByTitle(STALE_TITLE)).toHaveClass('opacity-40');
  });

  it('호가가 새것이면 흐리게 하지 않는다', () => {
    renderView();

    expect(screen.queryByTitle(STALE_TITLE)).not.toBeInTheDocument();
  });
});
