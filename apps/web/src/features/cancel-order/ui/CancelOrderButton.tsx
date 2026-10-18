import type { AccountOrder } from '@paper-futures/shared';
import { Button } from '@/shared/ui/button';
import { useCancelOrder } from '../api/use-cancel-order';

export function CancelOrderButton({ order }: { order: AccountOrder }) {
  const { mutate, isPending } = useCancelOrder();

  return (
    <Button
      variant="ghost"
      size="xs"
      disabled={isPending}
      onClick={() => mutate(order.id)}
    >
      취소
    </Button>
  );
}
