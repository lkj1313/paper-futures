import type { PriceLevel } from '@paper-futures/shared';
import { describe, expect, it } from 'vitest';
import { bidShare, buildBookRows } from './book-rows';

const book = (bids: PriceLevel[], asks: PriceLevel[]) => ({ bids, asks });

describe('buildBookRows', () => {
  it('가운데에서부터 수량을 더해 합계를 만든다', () => {
    const { bids } = buildBookRows(
      book(
        [
          ['100.0', '1'],
          ['99.9', '2'],
          ['99.8', '3'],
        ],
        [],
      ),
      10,
    );

    expect(bids.map((row) => [row.price, row.qty, row.total])).toEqual([
      ['100.0', '1', '1'],
      ['99.9', '2', '3'],
      ['99.8', '3', '6'],
    ]);
  });

  it('소수도 오차 없이 더한다', () => {
    const { asks } = buildBookRows(
      book(
        [],
        [
          ['100.1', '0.1'],
          ['100.2', '0.2'],
        ],
      ),
      10,
    );

    expect(asks.map((row) => row.total)).toEqual(['0.1', '0.3']);
  });

  it('가운데에서 가까운 단계부터 정해진 개수만 남긴다', () => {
    const { bids } = buildBookRows(
      book(
        [
          ['100.0', '1'],
          ['99.9', '1'],
          ['99.8', '1'],
        ],
        [],
      ),
      2,
    );

    expect(bids.map((row) => row.price)).toEqual(['100.0', '99.9']);
  });

  it('막대 길이는 쪽마다 그 쪽의 가장 큰 합계를 100%로 놓고 정한다', () => {
    const { bids, asks } = buildBookRows(
      book(
        [
          ['100.0', '2'],
          ['99.9', '6'],
        ],
        [
          ['100.1', '1'],
          ['100.2', '3'],
        ],
      ),
      10,
    );

    expect(bids.map((row) => row.ratio)).toEqual([0.25, 1]);
    expect(asks.map((row) => row.ratio)).toEqual([0.25, 1]);
  });

  it('호가가 없는 쪽이 있어도 만든다', () => {
    expect(buildBookRows(book([], []), 10)).toEqual({ bids: [], asks: [] });

    const { bids } = buildBookRows(book([['100.0', '2']], []), 10);
    expect(bids[0].ratio).toBe(1);
  });
});

describe('bidShare', () => {
  it('받은 호가 전체에서 매수 물량이 차지하는 비율을 준다', () => {
    const share = bidShare(
      book(
        [
          ['100.0', '0.1'],
          ['99.9', '0.2'],
          ['99.8', '0.3'],
        ],
        [['100.1', '0.2']],
      ),
    );

    expect(share).toBe(0.75);
  });

  it('호가가 하나도 없으면 null', () => {
    expect(bidShare(book([], []))).toBeNull();
  });
});
