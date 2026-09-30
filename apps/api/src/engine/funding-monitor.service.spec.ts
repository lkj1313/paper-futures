import type { MarkPriceInfo } from '@paper-futures/shared';
import type { MarketService } from '../market/market.service.js';
import type { FundingRoundInput, FundingService } from './funding.service.js';
import { FundingMonitorService } from './funding-monitor.service.js';

const T1 = 1_000_000_000; // 이번 펀딩 시각
const T2 = T1 + 8 * 60 * 60 * 1000; // 다음 펀딩 시각

/** 이벤트 시각 time에 받은 마크가격 (다음 펀딩 시각 nextFundingTime) */
const mark = (
  nextFundingTime: number,
  time: number,
  fundingRate = '0.0001',
  markPrice = '83000',
): MarkPriceInfo => ({
  markPrice,
  indexPrice: markPrice,
  fundingRate,
  nextFundingTime,
  time,
  receivedAt: time,
});

describe('FundingMonitorService.observe', () => {
  let settled: FundingRoundInput[];
  let monitor: FundingMonitorService;

  beforeEach(() => {
    settled = [];
    const funding = {
      settle: async (input: FundingRoundInput) => {
        settled.push(input);
        return 0;
      },
    };
    monitor = new FundingMonitorService(
      {} as MarketService,
      funding as unknown as FundingService,
    );
  });

  it('다음 펀딩 시각이 넘어가면 넘어가기 직전에 본 비율과 마크가격으로 한 번 정산한다', async () => {
    monitor.observe('BTCUSDT', mark(T1, T1 - 2000, '0.0001', '83000'));
    monitor.observe('BTCUSDT', mark(T1, T1 - 1000, '0.00012', '83100')); // 같은 회차: 비율 갱신
    monitor.observe('BTCUSDT', mark(T2, T1 + 500, '0.0003', '83200')); // 넘어감
    monitor.observe('BTCUSDT', mark(T2, T1 + 1500, '0.0003', '83300')); // 이미 넘어간 뒤
    await monitor.idle();

    expect(settled).toEqual([
      {
        symbol: 'BTCUSDT',
        fundingTime: T1,
        fundingRate: '0.00012',
        markPrice: '83100',
      },
    ]);
  });

  it('시작 직후 처음 본 마크가격으로는 정산하지 않는다 (꺼져 있던 동안 지나간 회차는 건너뜀)', async () => {
    monitor.observe('BTCUSDT', mark(T2, T1 + 500));
    await monitor.idle();

    expect(settled).toEqual([]);
  });

  it('펀딩 시각이 아직 안 됐으면 다음 시각이 바뀌어도 정산하지 않는다', async () => {
    monitor.observe('BTCUSDT', mark(T1, T1 - 2000));
    monitor.observe('BTCUSDT', mark(T2, T1 - 1000));
    await monitor.idle();

    expect(settled).toEqual([]);
  });
});
