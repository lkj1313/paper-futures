import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTokenStore } from '@/shared/api/token-store';
import { Button } from '@/shared/ui/button';
import { logout } from '../api/auth-api';

export function LogoutButton() {
  const queryClient = useQueryClient();
  const clearAccessToken = useTokenStore((state) => state.clearAccessToken);
  const mutation = useMutation({
    mutationFn: logout,
    onSettled: () => {
      clearAccessToken();
      queryClient.clear();
    },
  });

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={mutation.isPending}
      onClick={() => mutation.mutate()}
    >
      로그아웃
    </Button>
  );
}
