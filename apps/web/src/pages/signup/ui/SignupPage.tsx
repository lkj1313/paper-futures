import { Link, useNavigate } from 'react-router';
import { SignupForm } from '@/features/auth';
import { DEFAULT_TRADE_PATH } from '@/shared/config/routes';

export function SignupPage() {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl bg-card p-6">
        <h1 className="mb-6 text-xl font-semibold">회원가입</h1>
        <SignupForm
          onSuccess={() => navigate(DEFAULT_TRADE_PATH, { replace: true })}
        />
        <p className="mt-4 text-sm text-muted-foreground">
          이미 계정이 있나요?{' '}
          <Link to="/login" className="text-foreground underline">
            로그인
          </Link>
        </p>
      </div>
    </main>
  );
}
