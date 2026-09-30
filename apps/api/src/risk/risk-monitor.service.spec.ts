import type { MarkPriceInfo } from '@paper-futures/shared';
import type { MarketService } from '../market/market.service.js';
import type { RedisService } from '../redis/redis.service.js';
import type { LiquidationService } from './liquidation.service.js';
import { RiskMonitorService } from './risk-monitor.service.js';

const mark = (markPrice: string): MarkPriceInfo => ({
  markPrice,
  indexPrice: markPrice,
  fundingRate: '0.0001',
  nextFundingTime: 0,
  time: 0,
  receivedAt: 0,
});

describe('RiskMonitorService.schedule', () => {
  it('종목마다 점검은 하나씩: 점검 중에 온 가격은 마지막 것만 이어서 점검한다', async () => {
    // 첫 BTC 점검은 release()를 부를 때까지 끝나지 않는다
    let release!: () => void;
    const firstBlocked = new Promise<void>((resolve) => (release = resolve));
    const checked: string[] = [];
    const liquidation = {
      checkSymbol: async (symbol: string, m: MarkPriceInfo) => {
        checked.push(`${symbol} ${m.markPrice}`);
        if (checked.length === 1) await firstBlocked;
        return 0;
      },
    };
    const monitor = new RiskMonitorService(
      {} as RedisService,
      {} as MarketService,
      liquidation as unknown as LiquidationService,
    );

    monitor.schedule('BTCUSDT', mark('81000'));
    monitor.schedule('BTCUSDT', mark('80900')); // 점검 중 → 기억
    monitor.schedule('BTCUSDT', mark('80800')); // 점검 중 → 덮어씀
    monitor.schedule('ETHUSDT', mark('2600')); // 다른 종목은 바로 점검

    expect(checked).toEqual(['BTCUSDT 81000', 'ETHUSDT 2600']);

    release();
    await monitor.idle();

    // 80900은 건너뛰고, 마지막에 온 80800으로 한 번만 이어서 점검
    expect(checked).toEqual(['BTCUSDT 81000', 'ETHUSDT 2600', 'BTCUSDT 80800']);
  });
});
