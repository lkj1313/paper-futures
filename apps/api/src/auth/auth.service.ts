import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';
import { UsersService } from '../users/users.service.js';
import type { SignupDto } from './dto/signup.dto.js';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async signup({ email, password }: SignupDto) {
    const passwordHash = await argon2.hash(password);
    return this.usersService.create({ email, passwordHash });
  }
}
