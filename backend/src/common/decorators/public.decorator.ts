/**
 * src/common/decorators/public.decorator.ts
 * Đánh dấu route public, không cần JWT
 */
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
