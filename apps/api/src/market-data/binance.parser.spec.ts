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
  ticker: {
    stream: 'btcusdt@ticker',
    data: {
      e: '24hrTicker',
      E: 1792051154614,
      s: 'BTCUSDT',
      p: '-2101.50',
      P: '-2.515',
      w: '81975.12',
      c: '81459.30',
      Q: '0.004',
      o: '83560.80',
      h: '84117.60',
      l: '80188.00',
      v: '214103.225',
      q: '17551551274.00',
      O: 1791964740000,
      C: 1792051154612,
      F: 8125000000,
      L: 8128000000,
      n: 3000001,
    },
  },
  kline: {
    stream: 'btcusdt@kline_15m',
    data: {
      e: 'kline',
      E: 1792329820185,
      s: 'BTCUSDT',
      k: {
        t: 1792329300000,
        T: 1792330199999,
        s: 'BTCUSDT',
        i: '15m',
        f: 8183115177,
        L: 8183126008,
        o: '81877.10',
        c: '81810.20',
        h: '81914.90',
        l: '81805.90',
        v: '462.679',
        n: 10812,
        x: false,
        q: '37872361.70110',
        V: '130.613',
        Q: '10693536.80310',
        B: '0',
      },
    },
  },
};

const parse = (message: unknown) =>
  parseBinanceMessage(JSON.stringify(message), 1000);

describe('parseBinanceMessage', () => {
  it('체결(aggTrade)을 MarketTrade로 바꾼다 (매수가 먼저 걸어 둔 체결이면 SELL)', () => {
    expect(parse(samples.aggTrade)).toEqual({
      symbol: 'BTCUSDT',
      kind: 'trade',
      data: {
        id: 3467435296,
        price: '83105.30',
        qty: '0.100',
        side: 'SELL',
        time: 1790578730196,
        receivedAt: 1000,
      },
    });
  });

  it('매도가 먼저 걸어 둔 체결이면 BUY', () => {
    const takerBuy = structuredClone(samples.aggTrade);
    takerBuy.data.m = false;
    expect(parse(takerBuy)).toMatchObject({ data: { side: 'BUY' } });
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

  it('24시간 통계(24hrTicker)를 Ticker24h로 바꾼다 (등락은 음수 가능)', () => {
    expect(parse(samples.ticker)).toEqual({
      symbol: 'BTCUSDT',
      kind: 'ticker',
      data: {
        lastPrice: '81459.30',
        priceChange: '-2101.50',
        priceChangePercent: '-2.515',
        openPrice: '83560.80',
        highPrice: '84117.60',
        lowPrice: '80188.00',
        volume: '214103.225',
        quoteVolume: '17551551274.00',
        time: 1792051154614,
        receivedAt: 1000,
      },
    });
  });

  it('봉(kline)을 봉 간격과 Candle로 바꾼다', () => {
    expect(parse(samples.kline)).toEqual({
      symbol: 'BTCUSDT',
      kind: 'candle',
      interval: '15m',
      data: {
        time: 1792329300000,
        open: '81877.10',
        high: '81914.90',
        low: '81805.90',
        close: '81810.20',
        volume: '462.679',
      },
    });
  });

  it('다루지 않는 봉 간격이면 null', () => {
    const threeMinutes = structuredClone(samples.kline);
    threeMinutes.data.k.i = '3m';
    expect(parse(threeMinutes)).toBeNull();
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
    expect(parse({ stream: 'x', data: { e: 'bookTicker' } })).toBeNull();
    expect(parseBinanceMessage('not json')).toBeNull();
  });
});

describe('buildStreamUrl', () => {
  it('경로별로 두 종목의 스트림을 묶는다', () => {
    expect(buildStreamUrl('wss://fstream.binance.com', 'market')).toBe(
      'wss://fstream.binance.com/market/stream?streams=' +
        'btcusdt@aggTrade/btcusdt@markPrice@1s/btcusdt@ticker/' +
        'btcusdt@kline_1m/btcusdt@kline_5m/btcusdt@kline_15m/' +
        'btcusdt@kline_1h/btcusdt@kline_4h/btcusdt@kline_1d/' +
        'ethusdt@aggTrade/ethusdt@markPrice@1s/ethusdt@ticker/' +
        'ethusdt@kline_1m/ethusdt@kline_5m/ethusdt@kline_15m/' +
        'ethusdt@kline_1h/ethusdt@kline_4h/ethusdt@kline_1d',
    );
    expect(buildStreamUrl('wss://fstream.binance.com', 'public')).toBe(
      'wss://fstream.binance.com/public/stream?streams=' +
        'btcusdt@depth20@100ms/ethusdt@depth20@100ms',
    );
  });
});
