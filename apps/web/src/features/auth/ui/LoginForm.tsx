import { useMutation } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useTokenStore } from '@/shared/api/token-store';
import { notifyError } from '@/shared/lib/notify-error';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { login } from '../api/auth-api';

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const setAccessToken = useTokenStore((state) => state.setAccessToken);
  const mutation = useMutation({
    mutationFn: login,
    onSuccess: ({ accessToken }) => {
      setAccessToken(accessToken);
      onSuccess();
    },
    onError: notifyError,
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    mutation.mutate({
      email: String(form.get('email')),
      password: String(form.get('password')),
    });
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">이메일</Label>
        <Input id="email" name="email" type="email" autoComplete="email" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">비밀번호</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
        />
      </div>
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? '로그인 중' : '로그인'}
      </Button>
    </form>
  );
}
