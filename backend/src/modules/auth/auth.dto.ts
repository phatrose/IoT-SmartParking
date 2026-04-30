/**
 * src/modules/auth/auth.dto.ts
 */
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  hcmutId: string;

  @IsString()
  @MinLength(6)
  password: string;
}
