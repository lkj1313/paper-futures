import type { RedisService } from '../redis/redis.service.js';
import { MarketRelayService } from './market-relay.service.js';
import type { MarketGateway } from './market.gateway.js';

const trade = (price: string) =>
  JSON.stringify({ price, qty: '0.01', time: 1, receivedAt: 1 });
const depth = (ask: string) =>
  JSON.stringify({ bids: [], asks: [[ask, '1']], time: 1, receivedAt: 1 });

describe('MarketRelayService', () => {
  const gateway = {
    sendTrades: vi.fn(),
    sendMark: vi.fn(),
    sendDepth: vi.fn(),
  };
  const relay = new MarketRelayService(
    {} as RedisService,
    gateway as unknown as MarketGateway,
  );

  beforeEach(() => vi.clearAllMocks());

  it('마크가격은 오는 대로 바로 보낸다', () => {
    relay.receive(
      'BTCUSDT',
      'mark',
      JSON.stringify({ markPrice: '83000', time: 1 }),
    );

    expect(gateway.sendMark).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'BTCUSDT', markPrice: '83000' }),
    );
  });

  it('체결은 모아 두었다가 0.1초 차례에 종목별 배열로 한 번 보낸다', () => {
    relay.receive('BTCUSDT', 'trade', trade('83000'));
    relay.receive('BTCUSDT', 'trade', trade('83001'));
    relay.receive('ETHUSDT', 'trade', trade('2600'));
    expect(gateway.sendTrades).not.toHaveBeenCalled();

    relay.flush();

    expect(gateway.sendTrades).toHaveBeenCalledTimes(2);
    expect(gateway.sendTrades).toHaveBeenCalledWith({
      symbol: 'BTCUSDT',
      trades: [
        expect.objectContaining({ price: '83000' }),
        expect.objectContaining({ price: '83001' }),
      ],
    });

    // 보낸 뒤에는 비운다
    relay.flush();
    expect(gateway.sendTrades).toHaveBeenCalledTimes(2);
  });

  it('호가는 0.1초 동안 온 것 중 가장 최근 것만 보낸다', () => {
    relay.receive('BTCUSDT', 'depth', depth('83000'));
    relay.receive('BTCUSDT', 'depth', depth('83002'));

    relay.flush();

    expect(gateway.sendDepth).toHaveBeenCalledTimes(1);
    expect(gateway.sendDepth).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'BTCUSDT', asks: [['83002', '1']] }),
    );
  });
});
