import { Link } from 'react-router';

export function LoginPage() {
  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold">로그인</h1>
      <Link to="/signup" className="mt-4 inline-block underline">
        회원가입
      </Link>
    </main>
  );
}
