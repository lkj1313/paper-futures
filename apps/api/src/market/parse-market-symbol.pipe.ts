import { Injectable, type PipeTransform } from '@nestjs/common';
import { isMarketSymbol, type MarketSymbol } from '@paper-futures/shared';
import { AppException } from '../common/app.exception.js';

/** URL의 종목 이름을 검사한다. 소문자도 받아서 대문자로 바꾼다 */
@Injectable()
export class ParseMarketSymbolPipe implements PipeTransform<
  string,
  MarketSymbol
> {
  transform(value: string): MarketSymbol {
    const symbol = value.toUpperCase();
    if (!isMarketSymbol(symbol)) {
      throw new AppException('NOT_FOUND', {
        message: '지원하지 않는 종목입니다.',
      });
    }
    return symbol;
  }
}
