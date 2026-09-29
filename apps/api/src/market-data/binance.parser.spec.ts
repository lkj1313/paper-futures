import { buildStreamUrl, parseBinanceMessage } from './binance.parser.js';

// 실제 Binance 선물 WebSocket에서 받은 메시지 (필드 일부 생략)
const samples = {
  aggTrade: {
    stream: 'btcusdt@aggTrade',
    data: {
      e: 'aggTrade',
      E: 1790578730347,
      a: 3467435296,
      s: 'BTCUSDT',
      p: '83105.30',
      q: '0.100',
      nq: '0.100',
      f: 8125196817,
      l: 8125196817,
      T: 1790578730196,
      m: true,
      st: 1,
    },
  },
  markPrice: {
    stream: 'btcusdt@markPrice@1s',
    data: {
      e: 'markPriceUpdate',
      E: 1790578730000,
      s: 'BTCUSDT',
      p: '83105.30000000',
      ap: '83105.30000000',
      P: '83148.39917633',
      i: '83145.80586957',
      r: '-0.00002539',
      T: 1790582400000,
      st: 1,
    },
  },
  depth: {
    stream: 'btcusdt@depth20@100ms',
    data: {
      e: 'depthUpdate',
      E: 1790578729729,
      T: 1790578729728,
      s: 'BTCUSDT',
      ps: 'BTCUSDT',
      U: 11676904894520,
      u: 11676904904929,
      pu: 11676904894461,
      b: [
        ['83105.30', '18.833'],
        ['83105.20', '0.097'],
      ],
      a: [['83105.40', '1.224']],
    },
  },
};

const parse = (message: unknown) =>
  parseBinanceMessage(JSON.stringify(message), 1000);

describe('parseBinanceMessage', () => {
  it('체결(aggTrade)을 MarketTrade로 바꾼다', () => {
    expect(parse(samples.aggTrade)).toEqual({
      symbol: 'BTCUSDT',
      kind: 'trade',
      data: {
        price: '83105.30',
        qty: '0.100',
        time: 1790578730196,
        receivedAt: 1000,
      },
    });
  });

  it('마크가격(markPriceUpdate)을 MarkPriceInfo로 바꾼다', () => {
    expect(parse(samples.markPrice)).toEqual({
      symbol: 'BTCUSDT',
      kind: 'mark',
      data: {
        markPrice: '83105.30000000',
        indexPrice: '83145.80586957',
        fundingRate: '-0.00002539',
        nextFundingTime: 1790582400000,
        time: 1790578730000,
        receivedAt: 1000,
      },
    });
  });

  it('호가(depthUpdate)를 OrderBookDepth로 바꾼다', () => {
    expect(parse(samples.depth)).toEqual({
      symbol: 'BTCUSDT',
      kind: 'depth',
      data: {
        bids: [
          ['83105.30', '18.833'],
          ['83105.20', '0.097'],
        ],
        asks: [['83105.40', '1.224']],
        time: 1790578729729,
        receivedAt: 1000,
      },
    });
  });

  it('다루지 않는 종목이면 null', () => {
    const doge = structuredClone(samples.aggTrade);
    doge.data.s = 'DOGEUSDT';
    expect(parse(doge)).toBeNull();
  });

  it('가격이 숫자 모양이 아니면 null', () => {
    const broken = structuredClone(samples.markPrice);
    broken.data.p = 'NaN';
    expect(parse(broken)).toBeNull();
  });

  it('모르는 이벤트, JSON이 아닌 메시지면 null', () => {
    expect(parse({ stream: 'x', data: { e: 'kline' } })).toBeNull();
    expect(parseBinanceMessage('not json')).toBeNull();
  });
});

describe('buildStreamUrl', () => {
  it('경로별로 두 종목의 스트림을 묶는다', () => {
    expect(buildStreamUrl('wss://fstream.binance.com', 'market')).toBe(
      'wss://fstream.binance.com/market/stream?streams=' +
        'btcusdt@aggTrade/btcusdt@markPrice@1s/ethusdt@aggTrade/ethusdt@markPrice@1s',
    );
    expect(buildStreamUrl('wss://fstream.binance.com', 'public')).toBe(
      'wss://fstream.binance.com/public/stream?streams=' +
        'btcusdt@depth20@100ms/ethusdt@depth20@100ms',
    );
  });
});
