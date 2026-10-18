import { toDecimal } from '@paper-futures/shared';

export const toneOf = (value: string) => {
  const sign = toDecimal(value).cmp(0);
  if (sign > 0) return 'text-up';
  if (sign < 0) return 'text-down';
  return undefined;
};
