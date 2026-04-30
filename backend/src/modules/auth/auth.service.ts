/**
 * src/modules/auth/auth.service.ts
 *
 * Mock HCMUT_SSO authentication:
 *   - Production: gọi /api/sso/validate đến server SSO
 *   - Development: kiểm tra hcmutId + password trong local DB
 *
 * Trả về JWT token có hạn 8 giờ
 */
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../config/prisma.service';
import { LoginDto } from './auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    // Step 1: Tìm user
    const user = await this.prisma.user.findUnique({ where: { hcmutId: dto.hcmutId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị khóa');
    }

    // Step 2: Verify password (mock SSO – production sẽ delegate qua HCMUT_SSO)
    const valid = await bcrypt.compare(dto.password, user.passwordHash || '');
    if (!valid) throw new UnauthorizedException('Mật khẩu không đúng');

    // Step 3: Sinh JWT
    const payload = { sub: user.id, hcmutId: user.hcmutId, role: user.role };
    const accessToken = await this.jwt.signAsync(payload);

    this.logger.log(`Login OK: ${user.hcmutId} (${user.role})`);

    return {
      accessToken,
      user: {
        id: user.id,
        hcmutId: user.hcmutId,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        feeTier: user.feeTier,
        licensePlate: user.licensePlate,
      },
    };
  }
}
