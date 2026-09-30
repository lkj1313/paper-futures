export * from './errors.js';
export * from './market.js';
export * from './market-specs.js';
export * from './trading.js';
export * from './math/decimal.js';
export * from './math/rounding.js';
export * from './math/margin.js';
export * from './math/pnl.js';
export * from './math/liquidation.js';
export * from './math/fill.js';
export * from './math/funding.js';

/** 모의거래소에서 쓰는 유일한 자산 */
export const ASSET = 'USDT';
/** 회원가입 시 지급하는 모의 자금 (금액은 항상 문자열로 다룬다) */
export const SIGNUP_BONUS_USDT = '10000';
