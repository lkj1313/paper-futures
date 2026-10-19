import { useDeposit } from '../api/use-deposit';
import { DepositControl } from './DepositControl';

export function DepositButton() {
  const deposit = useDeposit();

  return (
    <DepositControl
      saving={deposit.isPending}
      onConfirm={(amount) => deposit.mutateAsync({ amount })}
    />
  );
}
