import { AppException } from '../common/app.exception.js';
import { ParseMarketSymbolPipe } from './parse-market-symbol.pipe.js';

describe('ParseMarketSymbolPipe', () => {
  const pipe = new ParseMarketSymbolPipe();

  it('지원하는 종목은 대문자로 통일해서 돌려준다', () => {
    expect(pipe.transform('BTCUSDT')).toBe('BTCUSDT');
    expect(pipe.transform('ethusdt')).toBe('ETHUSDT');
  });

  it('지원하지 않는 종목이면 NOT_FOUND', () => {
    expect(() => pipe.transform('DOGEUSDT')).toThrow(AppException);
    try {
      pipe.transform('DOGEUSDT');
    } catch (error) {
      expect((error as AppException).code).toBe('NOT_FOUND');
    }
  });
});
