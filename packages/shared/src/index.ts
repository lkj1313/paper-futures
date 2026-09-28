export * from './errors.js';

/** 모의거래소에서 쓰는 유일한 자산 */
export const ASSET = 'USDT';
/** 회원가입 시 지급하는 모의 자금 (금액은 항상 문자열로 다룬다) */
export const SIGNUP_BONUS_USDT = '10000';

export const SYMBOLS = ['BTCUSDT', 'ETHUSDT'] as const;
export type Symbol = (typeof SYMBOLS)[number];
