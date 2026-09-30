import { type AccountWallet, ASSET } from '@paper-futures/shared';
import type { Prisma } from '../../generated/prisma/client.js';

export class WalletResponseDto implements AccountWallet {
  /** 자산 종류 */
  asset: string;

  /** 지갑 잔고 (입금 + 실현 손익 − 수수료). 금액은 소수 오차를 피하려고 문자열로 준다 */
  balance: string;

  /** 열린 포지션들에 묶인 증거금 합계 */
  usedMargin: string;

  /** 대기 중인 지정가 주문에 묶인 금액 합계 (증거금 + 수수료) */
  openOrderMargin: string;

  /** 주문 가능 금액 = 잔고 − 사용 중 증거금 − 대기 주문에 묶인 금액 */
  availableBalance: string;

  static from(summary: {
    balance: Prisma.Decimal;
    usedMargin: Prisma.Decimal;
    openOrderMargin: Prisma.Decimal;
    availableBalance: Prisma.Decimal;
  }): WalletResponseDto {
    return {
      asset: ASSET,
      balance: summary.balance.toString(),
      usedMargin: summary.usedMargin.toString(),
      openOrderMargin: summary.openOrderMargin.toString(),
      availableBalance: summary.availableBalance.toString(),
    };
  }
}
