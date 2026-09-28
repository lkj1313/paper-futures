import { plainToInstance } from 'class-transformer';
import { NormalizeEmail } from './transformers.js';

class EmailDto {
  @NormalizeEmail()
  email: unknown;
}

const normalize = (email: unknown) =>
  plainToInstance(EmailDto, { email }).email;

describe('NormalizeEmail', () => {
  it('앞뒤 공백을 지우고 소문자로 바꾼다', () => {
    expect(normalize('  A@B.COM ')).toBe('a@b.com');
  });

  it('문자열이 아닌 값은 그대로 둔다 (검증 단계에서 걸러짐)', () => {
    expect(normalize(123)).toBe(123);
    expect(normalize(undefined)).toBeUndefined();
  });
});
