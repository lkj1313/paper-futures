import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { NormalizeEmail } from '../../common/transformers.js';

export class LoginDto {
  /** 앞뒤 공백을 지우고 소문자로 통일한다 */
  @NormalizeEmail()
  @IsEmail({}, { message: '이메일 형식이 아닙니다.' })
  email: string;

  @IsString({ message: '비밀번호는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '비밀번호를 입력하세요.' })
  @MaxLength(128, { message: '비밀번호는 128자 이하여야 합니다.' })
  password: string;
}
