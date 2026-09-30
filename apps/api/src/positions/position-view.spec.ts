import type { MarkPriceInfo } from '@paper-futures/shared';
import { toPositionLiveValues } from './position-view.js';

const now = 1_000_000;
const mark = (markPrice: string, receivedAt = now): MarkPriceInfo => ({
  markPrice,
  indexPrice: markPrice,
  fundingRate: '0.0001',
  nextFundingTime: 0,
  time: receivedAt,
  receivedAt,
});

// 롱 0.1개, 진입가 83,000.5, 증거금 830.005 (10배)
const long = {
  side: 'LONG' as const,
  qty: '0.1',
  entryPrice: '83000.5',
  isolatedMargin: '830.005',
};

describe('toPositionLiveValues', () => {
  it('롱: 마크가격 85,000 기준 손익, ROE', () => {
    expect(toPositionLiveValues(long, mark('85000'), now)).toEqual({
      markPrice: '85000',
      unrealizedPnl: '199.95', // (85,000 − 83,000.5) × 0.1
      roe: '0.24090216', // 199.95 ÷ 830.005
      stale: false,
    });
  });

  it('숏은 가격이 오르면 손실', () => {
    const v = toPositionLiveValues(
      { ...long, side: 'SHORT' },
      mark('85000'),
      now,
    );

    expect(v.unrealizedPnl).toBe('-199.95');
    expect(v.roe).toBe('-0.24090216');
  });

  it('마크가격이 없으면 손익과 ROE는 null', () => {
    expect(toPositionLiveValues(long, undefined, now)).toEqual({
      markPrice: null,
      unrealizedPnl: null,
      roe: null,
      stale: true,
    });
  });

  it('마크가격이 오래됐으면 stale', () => {
    expect(
      toPositionLiveValues(long, mark('85000', now - 10_000), now).stale,
    ).toBe(true);
  });
});
