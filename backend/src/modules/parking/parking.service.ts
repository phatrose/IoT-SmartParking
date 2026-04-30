/**
 * src/modules/parking/parking.service.ts
 *
 * UC-1: Check-in / Check-out qua RFID
 * SLA: API mở barrier < 2 giây
 *
 * Flow:
 *   1. Tìm user theo RFID
 *   2. Validate active + chưa có session
 *   3. Tạo ParkingSession
 *   4. Log audit
 *   5. Trả "granted=true" → barrier mở
 */
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import dayjs from 'dayjs';

@Injectable()
export class ParkingService {
  private readonly logger = new Logger(ParkingService.name);
  private readonly SLA_MS = 2000;

  constructor(private readonly prisma: PrismaService) {}

  async checkIn(params: { rfidCard: string; gateId: string; slotId?: number; ipAddress?: string }) {
    const t0 = Date.now();

    // Step 1: Tìm user theo RFID (indexed → nhanh)
    const user = await this.prisma.user.findUnique({
      where: { rfidCard: params.rfidCard },
    });

    if (!user) {
      await this.prisma.systemLog.create({
        data: {
          eventType:   'entry',
          description: `RFID không hợp lệ: ${params.rfidCard}`,
          status:      'WARN',
          ipAddress:   params.ipAddress,
        },
      });
      return { granted: false, reason: 'Thẻ không hợp lệ hoặc chưa đăng ký' };
    }

    if (!user.isActive) {
      return { granted: false, reason: 'Tài khoản đã bị khóa' };
    }

    // Step 2: Kiểm tra chưa có active session
    const active = await this.prisma.parkingSession.findFirst({
      where: { userId: user.id, status: 'ACTIVE' },
    });
    if (active) {
      return { granted: false, reason: 'Xe đã ở trong bãi (anti-double-entry)' };
    }

    // Step 3: Tạo session
    const billingPeriod = user.role === 'STUDENT' ? dayjs().format('YYYY-MM') : null;
    const session = await this.prisma.parkingSession.create({
      data: {
        userId:        user.id,
        slotId:        params.slotId ?? null,
        entryGate:     params.gateId,
        billingPeriod,
      },
    });

    // Step 4: Audit log
    await this.prisma.systemLog.create({
      data: {
        eventType:   'entry',
        userId:      user.id,
        userName:    user.fullName,
        description: `Vào bãi – Cổng ${params.gateId}`,
        metadata:    JSON.stringify({ rfid: params.rfidCard, sessionId: session.id }),
        ipAddress:   params.ipAddress,
      },
    });

    const elapsed = Date.now() - t0;
    if (elapsed > this.SLA_MS) {
      this.logger.warn(`⚠️  CheckIn SLA breach: ${elapsed}ms (limit ${this.SLA_MS}ms)`);
    }

    return {
      granted:     true,
      session_id:  session.id,
      user: { name: user.fullName, role: user.role, hcmut_id: user.hcmutId },
      message:     '✅ Mở cổng – Hoan nghênh!',
      processingMs: elapsed,
    };
  }

  async checkOut(params: { rfidCard: string; gateId: string; ipAddress?: string }) {
    const t0 = Date.now();

    const user = await this.prisma.user.findUnique({ where: { rfidCard: params.rfidCard } });
    if (!user) throw new BadRequestException('Thẻ không hợp lệ');

    const session = await this.prisma.parkingSession.findFirst({
      where: { userId: user.id, status: 'ACTIVE' },
    });
    if (!session) throw new BadRequestException('Không có phiên gửi xe đang hoạt động');

    // Tính duration
    const minutes = dayjs().diff(dayjs(session.entryTime), 'minute');

    const closed = await this.prisma.parkingSession.update({
      where: { id: session.id },
      data:  {
        exitTime:       new Date(),
        exitGate:       params.gateId,
        status:         'CLOSED',
        durationMinutes: minutes,
      },
    });

    // Tính phí preview (Visitor & Faculty trả ngay; Student trả cuối kỳ)
    let feePreview = 0;
    const policy = await this.prisma.pricingPolicy.findUnique({ where: { userRole: user.role } });
    if (policy && !policy.isExempt) {
      const hours = minutes / 60;
      const raw = Number(policy.ratePerHour) * hours;
      feePreview = Number(policy.dailyCap) > 0 ? Math.min(raw, Number(policy.dailyCap)) : raw;
    }

    await this.prisma.systemLog.create({
      data: {
        eventType:   'exit',
        userId:      user.id,
        userName:    user.fullName,
        description: `Ra bãi – ${minutes} phút${feePreview > 0 ? ` – ${feePreview.toLocaleString('vi-VN')}đ` : ''}`,
        ipAddress:   params.ipAddress,
      },
    });

    return {
      success:          true,
      session_id:       closed.id,
      duration_minutes: minutes,
      fee_preview:      Math.round(feePreview),
      message:          'Cổng mở – Hẹn gặp lại!',
      processingMs:     Date.now() - t0,
    };
  }

  async getActiveSession(userId: number) {
    return this.prisma.parkingSession.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: { slot: true },
    });
  }

  async getUserHistory(userId: number, limit = 50) {
    return this.prisma.parkingSession.findMany({
      where: { userId },
      include: { slot: { include: { zone: true } } },
      orderBy: { entryTime: 'desc' },
      take: limit,
    });
  }
}
