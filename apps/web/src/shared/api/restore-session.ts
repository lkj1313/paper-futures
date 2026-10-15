import { refreshAccessToken } from './refresh';
import { useTokenStore } from './token-store';

export async function restoreSession(): Promise<void> {
  if (useTokenStore.getState().accessToken !== null) return;
  await refreshAccessToken().catch(() => undefined);
}
