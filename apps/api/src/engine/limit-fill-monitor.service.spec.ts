import type { MarketService } from '../market/market.service.js';
import type { RedisService } from '../redis/redis.service.js';
import type { LimitFillService, TradeRange } from './limit-fill.service.js';
import { LimitFillMonitorService } from './limit-fill-monitor.service.js';

const createMonitor = (
  checkSymbol: (symbol: string, range: TradeRange) => Promise<number>,
) =>
  new LimitFillMonitorService(
    {} as RedisService,
    {} as MarketService,
    { checkSymbol } as unknown as LimitFillService,
  );

describe('LimitFillMonitorService', () => {
  it('체결가를 모으기만 하다가, 차례가 오면 최저와 최고로 한 번만 점검한다', async () => {
    const checked: (TradeRange & { symbol: string })[] = [];
    const monitor = createMonitor(async (symbol, range) => {
      checked.push({ symbol, ...range });
      return 0;
    });

    monitor.record('BTCUSDT', '82900', 1);
    monitor.record('BTCUSDT', '79990', 2);
    monitor.record('BTCUSDT', '83100', 3);
    monitor.record('BTCUSDT', '79990', 4); // 같은 최저가 → 늦은 시각을 남김
    expect(checked).toEqual([]); // 아직 DB 조회 없음

    monitor.flush(); // 0.1초 차례
    await monitor.idle();

    expect(checked).toEqual([
      { symbol: 'BTCUSDT', low: '79990', lowAt: 4, high: '83100', highAt: 3 },
    ]);
  });

  it('점검 중인 종목은 차례를 건너뛰고, 그동안 온 가격은 다음 점검에 모아서 넘긴다', async () => {
    let release!: () => void;
    const firstBlocked = new Promise<void>((resolve) => (release = resolve));
    const checked: string[] = [];
    const monitor = createMonitor(async (symbol, range) => {
      checked.push(`${symbol} ${range.low}~${range.high}`);
      if (checked.length === 1) await firstBlocked;
      return 0;
    });

    monitor.record('BTCUSDT', '83000', 1);
    monitor.flush(); // BTC 점검 시작 (release 전까지 안 끝남)
    monitor.record('BTCUSDT', '82000', 2);
    monitor.record('ETHUSDT', '2600', 2);
    monitor.flush(); // BTC는 점검 중 → 건너뜀, ETH는 바로 점검
    monitor.record('BTCUSDT', '84000', 3);
    monitor.flush(); // BTC는 여전히 점검 중

    expect(checked).toEqual(['BTCUSDT 83000~83000', 'ETHUSDT 2600~2600']);

    release();
    await monitor.idle();
    monitor.flush();
    await monitor.idle();

    // 점검 중에 온 82,000과 84,000이 한 번에 넘어간다
    expect(checked).toEqual([
      'BTCUSDT 83000~83000',
      'ETHUSDT 2600~2600',
      'BTCUSDT 82000~84000',
    ]);
  });
});
