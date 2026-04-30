/**
 * src/modules/iot/iot.service.ts
 *
 * UC-3: IoT sensor events + LED Board
 * SLA: cập nhật chỗ trống < 5 giây
 *
 * Fault tolerance:
 *   - Nếu device báo is_faulty = true  → đánh dấu slot faulty
 *   - Nếu timestamp quá cũ (> 5s)      → tự động flag faulty
 *   - Slot faulty không tham gia LED count
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../config/prisma.service';

export type LedState = 'OK' | 'NEARLY_FULL' | 'FULL' | 'UNKNOWN';

@Injectable()
export class IoTService {
  private readonly logger = new Logger(IoTService.name);
  private readonly TIMEOUT_MS: number;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.TIMEOUT_MS = parseInt(config.get('IOT_UPDATE_TIMEOUT_MS') ?? '5000');
  }

  async processSensorEvent(params: {
    sensorId: string;
    status: 'available' | 'occupied';
    isFaulty?: boolean;
    timestamp?: string;
  }) {
    const t0 = Date.now();
    const ts = params.timestamp ? new Date(params.timestamp) : new Date();
    const ageMs = Date.now() - ts.getTime();
    const isFaulty = params.isFaulty || ageMs > this.TIMEOUT_MS;

    if (isFaulty && ageMs > this.TIMEOUT_MS) {
      this.logger.warn(`Stale data ${params.sensorId} (age=${ageMs}ms)`);
    }

    // Tìm slot
    const slot = await this.prisma.parkingSlot.findUnique({
      where: { sensorId: params.sensorId },
      include: { zone: true },
    });
    if (!slot) {
      this.logger.warn(`Unknown sensor: ${params.sensorId}`);
      return { slot_code: null, zone_code: null, led_state: 'UNKNOWN' as LedState, processing_ms: Date.now() - t0 };
    }

    // Update slot status
    const newStatus = isFaulty
      ? 'FAULTY'
      : params.status === 'available' ? 'AVAILABLE' : 'OCCUPIED';

    await this.prisma.parkingSlot.update({
      where: { id: slot.id },
      data: {
        status:        newStatus,
        isFaulty,
        lastIotUpdate: new Date(),
      },
    });

    if (isFaulty) {
      await this.prisma.systemLog.create({
        data: {
          eventType:   'fault',
          userName:    params.sensorId,
          description: `Cảm biến ${slot.slotCode} bị lỗi`,
          status:      'WARN',
        },
      });
    }

    // Tính LED state
    const led = await this.computeLedState(slot.zone.zoneCode);

    const elapsed = Date.now() - t0;
    if (elapsed > this.TIMEOUT_MS) {
      this.logger.error(`⚠️ IoT SLA breach: ${elapsed}ms`);
    }

    return {
      success: true,
      slot_code: slot.slotCode,
      zone_code: slot.zone.zoneCode,
      led_state: led.state,
      processing_ms: elapsed,
    };
  }

  /**
   * Tính LED state dựa trên tỉ lệ trống của zone
   * - Trống > 30%: OK (xanh - "CÒN CHỖ")
   * - Trống 1-30%: NEARLY_FULL (vàng - "GẦN ĐẦY")
   * - Trống = 0: FULL (đỏ - "HẾT CHỖ")
   */
  async computeLedState(zoneCode: string) {
    const zone = await this.prisma.parkingZone.findUnique({
      where: { zoneCode },
      include: { slots: true },
    });
    if (!zone) return { zone: zoneCode, available: 0, total: 0, state: 'UNKNOWN' as LedState, label: '?' };

    const total = zone.slots.length;
    const available = zone.slots.filter(
      s => s.status === 'AVAILABLE' && !s.isFaulty,
    ).length;

    const pct = total > 0 ? available / total : 0;
    const state: LedState = pct > 0.3 ? 'OK' : pct > 0 ? 'NEARLY_FULL' : 'FULL';
    const label = { OK: 'CÒN CHỖ', NEARLY_FULL: 'GẦN ĐẦY', FULL: 'HẾT CHỖ', UNKNOWN: '?' }[state];

    return { zone: zoneCode, available, total, state, label };
  }

  async getAllSlots(zoneCode?: string) {
    return this.prisma.parkingSlot.findMany({
      where: zoneCode ? { zone: { zoneCode } } : undefined,
      include: { zone: true },
      orderBy: [{ zone: { zoneCode: 'asc' } }, { slotCode: 'asc' }],
    });
  }

  async markSensorFault(sensorId: string) {
    return this.processSensorEvent({ sensorId, status: 'occupied', isFaulty: true });
  }

  /**
   * Mô phỏng IoT thay đổi ngẫu nhiên (gọi định kỳ từ server)
   */
  async simulateRandomChanges() {
    const slots = await this.prisma.parkingSlot.findMany({
      where: { isFaulty: false },
      take: 200,
    });
    if (slots.length === 0) return;

    // Đảo ngẫu nhiên 3 slots
    const shuffled = slots.sort(() => Math.random() - 0.5).slice(0, 3);
    for (const s of shuffled) {
      const newStatus = s.status === 'AVAILABLE' ? 'OCCUPIED' : 'AVAILABLE';
      await this.prisma.parkingSlot.update({
        where: { id: s.id },
        data:  { status: newStatus, lastIotUpdate: new Date() },
      });
    }
  }
}
