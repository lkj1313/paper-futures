import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { useTokenStore } from '@/shared/api/token-store';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';
import { LoginForm } from './LoginForm';

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('이메일'), email);
  await user.type(screen.getByLabelText('비밀번호'), password);
  await user.click(screen.getByRole('button', { name: '로그인' }));
}

describe('LoginForm', () => {
  it('성공하면 입력값으로 로그인하고 토큰을 저장한 뒤 onSuccess를 부른다', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post('/api/auth/login', async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({ accessToken: 'token-1' });
      }),
    );
    const onSuccess = vi.fn();
    renderWithProviders(<LoginForm onSuccess={onSuccess} />);

    await fillAndSubmit('a@b.com', 'password123');

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(bodies).toEqual([{ email: 'a@b.com', password: 'password123' }]);
    expect(useTokenStore.getState().accessToken).toBe('token-1');
  });

  it('실패하면 서버 메시지를 토스트로 보여 주고 토큰은 그대로 둔다', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json(
          {
            statusCode: 401,
            code: 'INVALID_CREDENTIALS',
            message: '이메일 또는 비밀번호가 올바르지 않습니다.',
          },
          { status: 401 },
        ),
      ),
    );
    const onSuccess = vi.fn();
    renderWithProviders(<LoginForm onSuccess={onSuccess} />);

    await fillAndSubmit('a@b.com', 'wrong-password');

    expect(
      await screen.findByText('이메일 또는 비밀번호가 올바르지 않습니다.'),
    ).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(useTokenStore.getState().accessToken).toBeNull();
  });
});
