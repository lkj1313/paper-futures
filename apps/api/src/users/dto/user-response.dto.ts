import type { User } from '../../generated/prisma/client.js';

/** 외부에 공개해도 되는 사용자 정보 */
export class UserResponseDto {
  id: string;
  email: string;
  createdAt: Date;

  static from(user: Pick<User, 'id' | 'email' | 'createdAt'>): UserResponseDto {
    return { id: user.id, email: user.email, createdAt: user.createdAt };
  }
}
