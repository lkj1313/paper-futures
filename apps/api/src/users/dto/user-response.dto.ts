import { ApiProperty } from '@nestjs/swagger';
import type { UserProfile } from '@paper-futures/shared';
import type { User } from '../../generated/prisma/client.js';

/** 외부에 공개해도 되는 사용자 정보 */
export class UserResponseDto implements UserProfile {
  id: string;
  email: string;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  static from(user: Pick<User, 'id' | 'email' | 'createdAt'>): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
