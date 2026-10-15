import { HttpResponse, http as rest } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/server';
import { http } from './http';
import { useTokenStore } from './token-store';

function captureAuthorization() {
  const seen: (string | null)[] = [];
  server.use(
    rest.get('/api/users/me', ({ request }) => {
      seen.push(request.headers.get('authorization'));
      return HttpResponse.json({});
    }),
  );
  return seen;
}

describe('http 요청 인터셉터', () => {
  it('토큰이 없으면 Authorization 헤더를 붙이지 않는다', async () => {
    const seen = captureAuthorization();

    await http.get('/users/me');

    expect(seen).toEqual([null]);
  });

  it('저장된 토큰을 Bearer로 붙인다', async () => {
    const seen = captureAuthorization();
    useTokenStore.getState().setAccessToken('token-1');

    await http.get('/users/me');

    expect(seen).toEqual(['Bearer token-1']);
  });

  it('토큰이 바뀌면 다음 요청부터 새 토큰을 쓴다', async () => {
    const seen = captureAuthorization();
    useTokenStore.getState().setAccessToken('token-1');
    await http.get('/users/me');
    useTokenStore.getState().setAccessToken('token-2');
    await http.get('/users/me');

    expect(seen).toEqual(['Bearer token-1', 'Bearer token-2']);
  });
});
