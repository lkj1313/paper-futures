import { Link } from 'react-router';

export function SignupPage() {
  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold">회원가입</h1>
      <Link to="/login" className="mt-4 inline-block underline">
        로그인
      </Link>
    </main>
  );
}
