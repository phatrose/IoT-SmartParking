/**
 * src/common/decorators/roles.decorator.ts
 * Decorator để khai báo role nào được phép truy cập endpoint
 *
 * Usage:
 *   @Roles('ADMIN', 'OPERATOR')
 *   @Post('manage')
 *   doSomething() {}
 */
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
