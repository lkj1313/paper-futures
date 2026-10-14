import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { useTokenStore } from '@/shared/api/token-store';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';
import { SignupForm } from './SignupForm';

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('이메일'), email);
  await user.type(screen.getByLabelText('비밀번호'), password);
  await user.click(screen.getByRole('button', { name: '가입하기' }));
}

function trackAuthCalls() {
  const calls: string[] = [];
  server.use(
    http.post('/api/auth/signup', () => {
      calls.push('signup');
      return HttpResponse.json(
        {
          id: 'user-1',
          email: 'a@b.com',
          createdAt: '2026-10-14T00:00:00.000Z',
        },
        { status: 201 },
      );
    }),
    http.post('/api/auth/login', () => {
      calls.push('login');
      return HttpResponse.json({ accessToken: 'token-1' });
    }),
  );
  return calls;
}

describe('SignupForm', () => {
  it('가입에 성공하면 이어서 로그인하고 토큰을 저장한다', async () => {
    const calls = trackAuthCalls();
    const onSuccess = vi.fn();
    renderWithProviders(<SignupForm onSuccess={onSuccess} />);

    await fillAndSubmit('a@b.com', 'password123');

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(calls).toEqual(['signup', 'login']);
    expect(useTokenStore.getState().accessToken).toBe('token-1');
  });

  it('이미 가입된 이메일이면 토스트를 보여 주고 로그인은 하지 않는다', async () => {
    const calls = trackAuthCalls();
    server.use(
      http.post('/api/auth/signup', () => {
        calls.push('signup');
        return HttpResponse.json(
          {
            statusCode: 409,
            code: 'EMAIL_ALREADY_EXISTS',
            message: '이미 가입된 이메일입니다.',
          },
          { status: 409 },
        );
      }),
    );
    const onSuccess = vi.fn();
    renderWithProviders(<SignupForm onSuccess={onSuccess} />);

    await fillAndSubmit('a@b.com', 'password123');

    expect(
      await screen.findByText('이미 가입된 이메일입니다.'),
    ).toBeInTheDocument();
    expect(calls).toEqual(['signup']);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('검증 실패 메시지는 한 토스트에 모두 보여 준다', async () => {
    server.use(
      http.post('/api/auth/signup', () =>
        HttpResponse.json(
          {
            statusCode: 400,
            code: 'VALIDATION_ERROR',
            message: '요청 값이 올바르지 않습니다.',
            details: [
              { path: 'email', message: '이메일 형식이 아닙니다.' },
              {
                path: 'password',
                message: '비밀번호는 8자 이상 128자 이하여야 합니다.',
              },
            ],
          },
          { status: 400 },
        ),
      ),
    );
    renderWithProviders(<SignupForm onSuccess={vi.fn()} />);

    await fillAndSubmit('not-an-email', '123');

    expect(
      await screen.findByText('이메일 형식이 아닙니다.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('비밀번호는 8자 이상 128자 이하여야 합니다.'),
    ).toBeInTheDocument();
  });
});
