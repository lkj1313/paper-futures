import type { Candle, CandleEvent } from '@paper-futures/shared';
import { describe, expect, it } from 'vitest';
import { createFakeSocket } from '@/test/fake-socket';
import { createTestQueryClient } from '@/test/render';
import { candlesQueryKey } from '../api/use-candles';
import { bindCandleEvents } from './bind-candle-events';

const candle = (time: number, close: string): Candle => ({
  time,
  open: '83000',
  high: '83500',
  low: '82500',
  close,
  volume: '10',
});

const event = (
  fields: Partial<CandleEvent> & Pick<CandleEvent, 'candle'>,
): CandleEvent => ({ symbol: 'BTCUSDT', interval: '15m', ...fields });

function setup() {
  const client = createTestQueryClient();
  const { socket, receive } = createFakeSocket();
  bindCandleEvents(socket, client);
  return { client, receive };
}

describe('bindCandleEvents', () => {
  it('받은 봉을 그 종목·간격의 캔들 목록에만 끼워 넣는다', () => {
    const { client, receive } = setup();
    client.setQueryData(candlesQueryKey('BTCUSDT', '15m'), [
      candle(1, '83000'),
    ]);
    client.setQueryData(candlesQueryKey('BTCUSDT', '1h'), [candle(1, '83000')]);

    receive('candle', event({ candle: candle(1, '83100') }));
    receive('candle', event({ candle: candle(2, '83200') }));

    expect(client.getQueryData(candlesQueryKey('BTCUSDT', '15m'))).toEqual([
      candle(1, '83100'),
      candle(2, '83200'),
    ]);
    expect(client.getQueryData(candlesQueryKey('BTCUSDT', '1h'))).toEqual([
      candle(1, '83000'),
    ]);
  });

  it('지난 캔들을 아직 받지 않았으면 봉 하나로 목록을 만들지 않는다', () => {
    const { client, receive } = setup();

    receive('candle', event({ candle: candle(1, '83100') }));

    expect(
      client.getQueryData(candlesQueryKey('BTCUSDT', '15m')),
    ).toBeUndefined();
  });

  it('다시 연결되면 모든 캔들 목록을 낡은 것으로 표시해 다시 받게 한다', () => {
    const { client, receive } = setup();
    client.setQueryData(candlesQueryKey('BTCUSDT', '15m'), []);
    client.setQueryData(candlesQueryKey('ETHUSDT', '1d'), []);

    receive('connect');

    for (const key of [
      candlesQueryKey('BTCUSDT', '15m'),
      candlesQueryKey('ETHUSDT', '1d'),
    ]) {
      expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    }
  });
});
