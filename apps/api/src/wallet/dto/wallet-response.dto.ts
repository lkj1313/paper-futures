import { ASSET } from '@paper-futures/shared';
import type { Wallet } from '../../generated/prisma/client.js';

export class WalletResponseDto {
  /** 자산 종류 */
  asset: string;

  /** 잔고. 소수 오차를 피하려고 숫자 대신 문자열로 준다 */
  balance: string;

  static from(wallet: Pick<Wallet, 'balance'>): WalletResponseDto {
    return { asset: ASSET, balance: wallet.balance.toString() };
  }
}
