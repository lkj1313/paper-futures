import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { AppException } from './app.exception.js';
import { createValidationPipe } from './validation.js';

class AddressDto {
  @MinLength(2)
  city: string;
}

class SampleDto {
  @IsEmail()
  email: string;

  @IsInt()
  @Min(1)
  qty: number;

  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;
}

describe('createValidationPipe', () => {
  const pipe = createValidationPipe();
  const validate = (value: unknown) =>
    pipe.transform(value, { type: 'body', metatype: SampleDto });

  it('올바른 값이면 DTO 인스턴스로 변환해서 통과시킨다', async () => {
    const result = await validate({
      email: 'a@b.com',
      qty: 1,
      address: { city: 'Seoul' },
    });

    expect(result).toBeInstanceOf(SampleDto);
    expect(result.address).toBeInstanceOf(AddressDto);
  });

  it('틀린 값이면 VALIDATION_ERROR와 필드별 상세를 담아 던진다', async () => {
    const error = await validate({
      email: 'not-email',
      qty: 0,
      address: { city: 'S' },
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AppException);
    const appError = error as AppException;
    expect(appError.code).toBe('VALIDATION_ERROR');
    expect(appError.getStatus()).toBe(400);
    expect(appError.details?.map((d) => d.path).sort()).toEqual([
      'address.city',
      'email',
      'qty',
    ]);
  });

  it('DTO에 없는 필드가 오면 거부한다', async () => {
    const error = await validate({
      email: 'a@b.com',
      qty: 1,
      address: { city: 'Seoul' },
      balance: 999999,
    }).catch((e: unknown) => e);

    expect((error as AppException).details).toEqual([
      { path: 'balance', message: expect.any(String) },
    ]);
  });
});
