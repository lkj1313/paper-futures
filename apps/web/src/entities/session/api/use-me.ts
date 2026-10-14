import type { UserProfile } from '@paper-futures/shared';
import { useQuery } from '@tanstack/react-query';
import { http } from '@/shared/api/http';
import { useIsLoggedIn } from '../model/use-is-logged-in';

export function useMe() {
  const isLoggedIn = useIsLoggedIn();

  return useQuery({
    queryKey: ['me'],
    queryFn: () => http.get<UserProfile>('/users/me').then((res) => res.data),
    enabled: isLoggedIn,
  });
}
