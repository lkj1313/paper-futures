import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold">페이지를 찾을 수 없습니다</h1>
      <Link to="/" className="mt-4 inline-block underline">
        거래 화면으로
      </Link>
    </main>
  );
}
