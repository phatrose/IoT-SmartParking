/**
 * src/common/decorators/current-user.decorator.ts
 * Lấy user hiện tại từ JWT (đã được JwtStrategy gắn vào req.user)
 *
 * Usage:
 *   @Get('profile')
 *   getProfile(@CurrentUser() user) { return user; }
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
