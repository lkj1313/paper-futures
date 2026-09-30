import { type Decimal, toDecimal } from '@paper-futures/shared';
import type { Prisma } from '../generated/prisma/client.js';

/** DB의 Decimal(20, 8)에 맞춰 소수 8자리로 반올림한 문자열 */
export const toDb = (value: Decimal) => value.toDecimalPlaces(8).toFixed();

/** Prisma Decimal → 계산용 Decimal */
export const fromDb = (value: Prisma.Decimal) => toDecimal(value.toString());
