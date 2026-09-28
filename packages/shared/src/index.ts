export * from './errors.js';

export const SYMBOLS = ['BTCUSDT', 'ETHUSDT'] as const;
export type Symbol = (typeof SYMBOLS)[number];
