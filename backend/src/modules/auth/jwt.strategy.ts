/**
 * src/modules/auth/jwt.strategy.ts
 * Validate JWT token và load user vào req.user
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../config/prisma.service';

export interface JwtPayload {
  sub: number;        // user id
  hcmutId: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    // Lấy user từ DB để chắc user vẫn active
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User không tồn tại hoặc bị khóa');
    }
    return {
      id: user.id,
      hcmutId: user.hcmutId,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      feeTier: user.feeTier,
    };
  }
}
