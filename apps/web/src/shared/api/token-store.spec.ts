import { describe, expect, it } from 'vitest';
import { useTokenStore } from './token-store';

describe('useTokenStore', () => {
  it('처음에는 토큰이 없다', () => {
    expect(useTokenStore.getState().accessToken).toBeNull();
  });

  it('토큰을 저장하고 지운다', () => {
    useTokenStore.getState().setAccessToken('token-1');
    expect(useTokenStore.getState().accessToken).toBe('token-1');

    useTokenStore.getState().clearAccessToken();
    expect(useTokenStore.getState().accessToken).toBeNull();
  });
});
