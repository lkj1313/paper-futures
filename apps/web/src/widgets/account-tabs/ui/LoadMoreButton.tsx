import { Button } from '@/shared/ui/button';

export interface LoadMoreProps {
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

export function LoadMoreButton({
  hasMore,
  loadingMore,
  onLoadMore,
}: LoadMoreProps) {
  if (!hasMore) return null;

  return (
    <div className="flex justify-center py-2">
      <Button
        variant="ghost"
        size="xs"
        disabled={loadingMore}
        onClick={onLoadMore}
      >
        {loadingMore ? '불러오는 중…' : '더 보기'}
      </Button>
    </div>
  );
}
