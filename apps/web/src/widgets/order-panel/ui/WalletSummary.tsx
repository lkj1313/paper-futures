import { useWallet } from '@/entities/wallet';
import { WalletSummaryView } from './WalletSummaryView';

export function WalletSummary() {
  const { data } = useWallet();
  return <WalletSummaryView wallet={data} />;
}
