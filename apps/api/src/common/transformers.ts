import { Transform } from 'class-transformer';

/** 이메일 정리: 앞뒤 공백 제거 + 소문자 통일 */
export function NormalizeEmail() {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
}
