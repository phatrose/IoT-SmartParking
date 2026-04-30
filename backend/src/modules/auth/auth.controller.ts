/**
 * src/modules/auth/auth.controller.ts
 */
import { Body, Controller, Post, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './auth.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/login  (public)
   * Body: { hcmutId, password }
   * → { accessToken, user }
   */
  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * GET /api/auth/me  (protected)
   * Trả về user hiện tại từ JWT
   */
  @Get('me')
  me(@CurrentUser() user) {
    return user;
  }
}
