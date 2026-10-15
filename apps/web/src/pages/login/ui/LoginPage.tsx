import { Link, useNavigate } from 'react-router';
import { LoginForm } from '@/features/auth';
import { DEFAULT_TRADE_PATH } from '@/shared/config/routes';

export function LoginPage() {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl bg-card p-6">
        <h1 className="mb-6 text-xl font-semibold">로그인</h1>
        <LoginForm
          onSuccess={() => navigate(DEFAULT_TRADE_PATH, { replace: true })}
        />
        <p className="mt-4 text-sm text-muted-foreground">
          계정이 없나요?{' '}
          <Link to="/signup" className="text-foreground underline">
            회원가입
          </Link>
        </p>
      </div>
    </main>
  );
}
