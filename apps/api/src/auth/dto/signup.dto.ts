import { IsEmail, IsString, Length } from 'class-validator';
import { NormalizeEmail } from '../../common/transformers.js';

export class SignupDto {
  /** 앞뒤 공백을 지우고 소문자로 통일한다 */
  @NormalizeEmail()
  @IsEmail({}, { message: '이메일 형식이 아닙니다.' })
  email: string;

  /** 8자 이상 128자 이하 */
  @IsString({ message: '비밀번호는 문자열이어야 합니다.' })
  @Length(8, 128, { message: '비밀번호는 8자 이상 128자 이하여야 합니다.' })
  password: string;
}
