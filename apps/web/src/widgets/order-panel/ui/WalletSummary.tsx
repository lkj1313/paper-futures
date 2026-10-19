import { useIsLoggedIn } from '@/entities/session';
import { useWallet } from '@/entities/wallet';
import { DepositButton } from '@/features/deposit';
import { WalletSummaryView } from './WalletSummaryView';

export function WalletSummary() {
  const loggedIn = useIsLoggedIn();
  const { data } = useWallet();
  return (
    <WalletSummaryView
      wallet={data}
      action={loggedIn ? <DepositButton /> : undefined}
    />
  );
}
