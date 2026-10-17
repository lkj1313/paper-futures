import type { MarketTrade } from '@paper-futures/shared';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMarketStore } from '@/entities/market/model/market-store';
import { subscribeMarket } from '@/shared/socket';
import { MarketHeader } from './MarketHeader';

vi.mock('@/shared/socket', () => ({
  subscribeMarket: vi.fn(),
  unsubscribeMarket: vi.fn(),
}));

const STALE_TITLE = '시세가 늦게 들어오고 있습니다';
const HOUR = 60 * 60 * 1000;

const trade = (id: number, price: string): MarketTrade => ({
  id,
  price,
  qty: '0.001',
  side: 'BUY',
  time: Date.now(),
  receivedAt: Date.now(),
});

function receiveMark() {
  useMarketStore.getState().applyMark({
    symbol: 'BTCUSDT',
    markPrice: '82156.03000000',
    indexPrice: '82160.31000000',
    fundingRate: '0.00010000',
    nextFundingTime: Date.now() + HOUR,
    time: Date.now(),
    receivedAt: Date.now(),
  });
}

function receiveTicker(priceChange: string, priceChangePercent: string) {
  useMarketStore.getState().applyTicker({
    symbol: 'BTCUSDT',
    lastPrice: '82156.10',
    priceChange,
    priceChangePercent,
    openPrice: '81310.80',
    highPrice: '83000.00',
    lowPrice: '81000.00',
    volume: '214103.225',
    quoteVolume: '17551551274.00',
    time: Date.now(),
    receivedAt: Date.now(),
  });
}

const valueOf = (label: string) => screen.getByText(label).nextElementSibling;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-17T00:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('MarketHeader', () => {
  it('화면에 나타나면 그 종목을 구독한다', () => {
    render(<MarketHeader symbol="BTCUSDT" />);

    expect(subscribeMarket).toHaveBeenCalledWith('BTCUSDT');
  });

  it('시세를 받기 전에는 --를 보여 주고 흐리게 둔다', () => {
    render(<MarketHeader symbol="BTCUSDT" />);

    expect(valueOf('현재가')).toHaveTextContent('--');
    expect(valueOf('마크가격')).toHaveTextContent('--');
    expect(valueOf('24h 변동')).toHaveTextContent('--');
    expect(screen.getByTitle(STALE_TITLE)).toHaveClass('opacity-40');
  });

  it('받은 시세를 형식에 맞춰 보여 준다', () => {
    useMarketStore.getState().applyTrades({
      symbol: 'BTCUSDT',
      trades: [trade(1, '82156.0'), trade(2, '82156.5')],
    });
    receiveMark();
    receiveTicker('845.30', '1.040');

    render(<MarketHeader symbol="BTCUSDT" />);

    expect(valueOf('현재가')).toHaveTextContent('82,156.5');
    expect(valueOf('현재가')).toHaveClass('text-up');
    expect(valueOf('마크가격')).toHaveTextContent('82,156.0');
    expect(valueOf('인덱스가격')).toHaveTextContent('82,160.3');
    expect(valueOf('펀딩비 / 남은 시간')).toHaveTextContent(
      '0.0100% / 01:00:00',
    );
    expect(valueOf('24h 변동')).toHaveTextContent('+845.3 +1.04%');
    expect(valueOf('24h 변동')).toHaveClass('text-up');
    expect(valueOf('24h 고가')).toHaveTextContent('83,000.0');
    expect(valueOf('24h 저가')).toHaveTextContent('81,000.0');
    expect(valueOf('24h 거래량(BTC)')).toHaveTextContent('214,103.225');
    expect(valueOf('24h 거래량(USDT)')).toHaveTextContent('17.55B');
    expect(screen.queryByTitle(STALE_TITLE)).not.toBeInTheDocument();
  });

  it('체결이 아직 없으면 24시간 시세의 마지막 가격을 현재가로 쓴다', () => {
    receiveTicker('845.30', '1.040');

    render(<MarketHeader symbol="BTCUSDT" />);

    expect(valueOf('현재가')).toHaveTextContent('82,156.1');
  });

  it('24h 변동이 음수면 빨강으로 보여 준다', () => {
    receiveTicker('-2101.50', '-2.515');

    render(<MarketHeader symbol="BTCUSDT" />);

    expect(valueOf('24h 변동')).toHaveTextContent('-2,101.5 -2.52%');
    expect(valueOf('24h 변동')).toHaveClass('text-down');
  });

  it('다음 펀딩까지 남은 시간이 1초마다 줄어든다', () => {
    receiveMark();
    render(<MarketHeader symbol="BTCUSDT" />);

    act(() => vi.advanceTimersByTime(1000));

    expect(valueOf('펀딩비 / 남은 시간')).toHaveTextContent(
      '0.0100% / 00:59:59',
    );
  });

  it('마크가격을 받은 지 5초가 넘으면 흐려지고, 다시 받으면 돌아온다', () => {
    receiveMark();
    render(<MarketHeader symbol="BTCUSDT" />);
    expect(screen.queryByTitle(STALE_TITLE)).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByTitle(STALE_TITLE)).toHaveClass('opacity-40');

    act(() => receiveMark());
    expect(screen.queryByTitle(STALE_TITLE)).not.toBeInTheDocument();
  });
});
