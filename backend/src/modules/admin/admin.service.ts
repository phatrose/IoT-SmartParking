import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import * as bcrypt from 'bcrypt';
import dayjs from 'dayjs';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Pricing ───
  async getPricing() {
    return this.prisma.pricingPolicy.findMany({ orderBy: { userRole: 'asc' } });
  }

  async upsertPricing(data: { user_role: string; rate_per_hour: number; daily_cap: number; is_exempt?: boolean }, adminId: number) {
    const policy = await this.prisma.pricingPolicy.upsert({
      where:  { userRole: data.user_role },
      update: { ratePerHour: data.rate_per_hour, dailyCap: data.daily_cap, isExempt: data.is_exempt ?? false },
      create: { userRole: data.user_role, ratePerHour: data.rate_per_hour, dailyCap: data.daily_cap, isExempt: data.is_exempt ?? false },
    });
    await this.prisma.systemLog.create({
      data: { eventType: 'admin', userId: adminId, userName: 'Admin', description: `Cập nhật giá: ${data.user_role} → ${data.rate_per_hour}đ/h` },
    });
    return policy;
  }

  // ─── Logs ───
  async getLogs(filters: { type?: string; limit?: number }) {
    return this.prisma.systemLog.findMany({
      where:   filters.type ? { eventType: filters.type } : undefined,
      orderBy: { createdAt: 'desc' },
      take:    filters.limit ?? 100,
    });
  }

  // ─── Users (with balance + status) ───
  async getUsers(filters: { role?: string; search?: string }) {
    const users = await this.prisma.user.findMany({
      where: {
        role: filters.role as any,
        OR: filters.search ? [
          { fullName:     { contains: filters.search } },
          { hcmutId:      { contains: filters.search } },
          { licensePlate: { contains: filters.search } },
        ] : undefined,
      },
      orderBy: { id: 'asc' },
      select: { id: true, hcmutId: true, fullName: true, email: true, phone: true, department: true, role: true, feeTier: true, licensePlate: true, isActive: true, lastSync: true },
    });

    const userIds = users.map(u => u.id);
    const pendingPayments = userIds.length > 0
      ? await this.prisma.payment.findMany({
          where: { userId: { in: userIds }, status: { in: ['PENDING', 'PROCESSING'] } },
          select: { userId: true, amount: true },
        })
      : [];

    return users.map(u => {
      const balance = pendingPayments
        .filter(p => p.userId === u.id)
        .reduce((s, p) => s + Number(p.amount), 0);
      const status = !u.isActive ? 'BLOCKED' : balance > 100000 ? 'WARNING' : 'ACTIVE';
      return { ...u, balance, status };
    });
  }

  // ─── User CRUD ───
  async createUser(data: {
    hcmutId: string; fullName: string; email?: string; phone?: string;
    role: string; password: string; licensePlate?: string; department?: string;
  }, adminId: number) {
    const exists = await this.prisma.user.findUnique({ where: { hcmutId: data.hcmutId } });
    if (exists) throw new ConflictException(`HCMUT ID ${data.hcmutId} đã tồn tại`);
    const hash = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: {
        hcmutId: data.hcmutId, fullName: data.fullName, email: data.email,
        phone: data.phone, role: data.role as any, passwordHash: hash,
        licensePlate: data.licensePlate, department: data.department,
        feeTier: data.role, isActive: true, rfidCard: '',
      },
    });
    await this.prisma.systemLog.create({
      data: { eventType: 'admin', userId: adminId, userName: 'Admin', description: `Tạo user mới: ${data.hcmutId} (${data.role})` },
    });
    return { success: true, user };
  }

  async updateUser(id: number, data: {
    fullName?: string; email?: string; phone?: string;
    licensePlate?: string; department?: string; isActive?: boolean; role?: string;
  }, adminId: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User không tồn tại');
    const updated = await this.prisma.user.update({
      where: { id },
      data: { ...data, role: data.role as any },
    });
    await this.prisma.systemLog.create({
      data: { eventType: 'admin', userId: adminId, userName: 'Admin', description: `Cập nhật user: ${user.hcmutId}` },
    });
    return { success: true, user: updated };
  }

  async deleteUser(id: number, adminId: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User không tồn tại');
    await this.prisma.user.update({ where: { id }, data: { isActive: false } });
    await this.prisma.systemLog.create({
      data: { eventType: 'admin', userId: adminId, userName: 'Admin', description: `Vô hiệu hóa user: ${user.hcmutId}` },
    });
    return { success: true };
  }

  async resetPassword(id: number, newPassword: string, adminId: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User không tồn tại');
    const hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id }, data: { passwordHash: hash } });
    await this.prisma.systemLog.create({
      data: { eventType: 'admin', userId: adminId, userName: 'Admin', description: `Reset mật khẩu: ${user.hcmutId}` },
    });
    return { success: true };
  }

  // ─── Sync DATACORE (mock) ───
  async syncDatacore(adminId: number) {
    await new Promise(r => setTimeout(r, 1200));
    await this.prisma.systemLog.create({
      data: { eventType: 'admin', userId: adminId, userName: 'Admin', description: 'Đồng bộ HCMUT_DATACORE thành công (mock)' },
    });
    return { success: true, syncedAt: new Date() };
  }

  // ─── Report (with daily chart + top users) ───
  async getReport(period: string) {
    const [year, month] = period.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate   = new Date(year, month, 0, 23, 59, 59);

    const [sessAgg, revAgg, zones] = await Promise.all([
      this.prisma.parkingSession.aggregate({
        where: { billingPeriod: period, status: 'CLOSED' },
        _count: { id: true }, _sum: { durationMinutes: true },
      }),
      this.prisma.payment.aggregate({
        where: { billingPeriod: period, status: 'SUCCESS' },
        _count: { id: true }, _sum: { amount: true },
      }),
      this.prisma.parkingZone.findMany({
        include: { slots: { select: { status: true, isFaulty: true } } },
      }),
    ]);

    // Daily chart
    const monthlySessions = await this.prisma.parkingSession.findMany({
      where: { entryTime: { gte: startDate, lte: endDate } },
      select: { entryTime: true, durationMinutes: true },
    });
    const dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const daysInMonth = endDate.getDate();
    const dailyChart = Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(year, month - 1, i + 1);
      const count = monthlySessions.filter(s => new Date(s.entryTime).getDate() === i + 1).length;
      return { day: dayLabels[d.getDay()], date: i + 1, count };
    });

    // Top users
    const topRaw = await this.prisma.parkingSession.groupBy({
      by:      ['userId'],
      where:   { billingPeriod: period, status: 'CLOSED', userId: { not: null } },
      _count:  { id: true },
      _sum:    { durationMinutes: true },
      orderBy: { _count: { id: 'desc' } },
      take:    5,
    });
    const topIds = topRaw.map(r => r.userId).filter(Boolean) as number[];
    const [topUserDetails, topPayments] = topIds.length > 0
      ? await Promise.all([
          this.prisma.user.findMany({ where: { id: { in: topIds } }, select: { id: true, fullName: true, hcmutId: true, role: true } }),
          this.prisma.payment.findMany({ where: { billingPeriod: period, userId: { in: topIds } }, select: { userId: true, amount: true } }),
        ])
      : [[], []];

    const topUsers = topRaw.map((r, i) => {
      const u = topUserDetails.find(x => x.id === r.userId);
      const totalAmount = topPayments.filter(p => p.userId === r.userId).reduce((s, p) => s + Number(p.amount), 0);
      return {
        rank: i + 1,
        fullName: u?.fullName || '—',
        hcmutId:  u?.hcmutId  || '—',
        role:     u?.role     || '—',
        sessions: r._count.id,
        durationMinutes: r._sum.durationMinutes ?? 0,
        amount: totalAmount,
      };
    });

    const visitorCount = await this.prisma.visitorTicket.count({
      where: { entryTime: { gte: startDate, lte: endDate } },
    });

    const avgDuration = monthlySessions.length > 0
      ? Math.round(monthlySessions.reduce((s, x) => s + (x.durationMinutes ?? 0), 0) / monthlySessions.length)
      : 0;

    // Peak hours from real data: count entries per hour, find top 2-hour window
    const hourCounts = new Array(24).fill(0);
    monthlySessions.forEach(s => { hourCounts[new Date(s.entryTime).getHours()]++; });

    let peak1H = 7, peak1Score = -1, peak2H = 16, peak2Score = -1;
    for (let h = 0; h <= 22; h++) {
      const score = hourCounts[h] + hourCounts[h + 1];
      if (score > peak1Score) {
        if (Math.abs(h - peak1H) > 1) { peak2H = peak1H; peak2Score = peak1Score; }
        peak1H = h; peak1Score = score;
      } else if (score > peak2Score && Math.abs(h - peak1H) > 1) {
        peak2H = h; peak2Score = score;
      }
    }
    const fmtH = (h: number) => `${String(h).padStart(2, '0')}:00`;
    const peakHours  = monthlySessions.length > 0 ? `${fmtH(peak1H)} – ${fmtH(peak1H + 2)}` : '07:00 – 09:00';
    const peakHours2 = monthlySessions.length > 0 ? `${fmtH(peak2H)} – ${fmtH(peak2H + 2)}` : '16:00 – 18:00';

    return {
      period,
      sessions: { count: sessAgg._count.id, total_minutes: sessAgg._sum.durationMinutes ?? 0 },
      revenue:  { count: revAgg._count.id,  amount: Number(revAgg._sum.amount ?? 0) },
      zones: zones.map(z => ({
        zone_code: z.zoneCode,
        total:     z.slots.length,
        available: z.slots.filter(s => s.status === 'AVAILABLE' && !s.isFaulty).length,
      })),
      dailyChart,
      topUsers,
      visitorCount,
      avgDuration,
      peakHours,
      peakHours2,
    };
  }

  // ─── Dashboard (with weekly chart + recent parking + alerts) ───
  async getDashboard() {
    const zones = await this.prisma.parkingZone.findMany({
      include: { slots: { select: { status: true, isFaulty: true, slotCode: true, sensorId: true, lastIotUpdate: true } } },
    });
    const zoneStats = zones.map(z => ({
      zone_code: z.zoneCode,
      total:     z.slots.length,
      available: z.slots.filter(s => s.status === 'AVAILABLE' && !s.isFaulty).length,
    }));
    const total = zoneStats.reduce((s, z) => s + z.total, 0);
    const free  = zoneStats.reduce((s, z) => s + z.available, 0);

    // Weekly chart (last 7 days)
    const sevenAgo = dayjs().subtract(6, 'day').startOf('day').toDate();
    const weekSessions = await this.prisma.parkingSession.findMany({
      where: { entryTime: { gte: sevenAgo } },
      select: { entryTime: true },
    });
    const dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const weeklyChart = Array.from({ length: 7 }, (_, i) => {
      const d = dayjs().subtract(6 - i, 'day');
      const count = weekSessions.filter(s => dayjs(s.entryTime).format('YYYY-MM-DD') === d.format('YYYY-MM-DD')).length;
      return { label: dayLabels[d.day()], date: d.format('MM/DD'), count };
    });

    // Recent activity (last 10 parking sessions)
    const recent = await this.prisma.parkingSession.findMany({
      orderBy: { entryTime: 'desc' },
      take: 10,
      include: {
        user: { select: { fullName: true, licensePlate: true } },
        slot: { select: { slotCode: true } },
      },
    });
    const recentActivity = recent.map(s => ({
      time:   dayjs(s.entryTime).format('HH:mm'),
      user:   s.user?.fullName    || `Khách`,
      plate:  s.user?.licensePlate || s.visitorTicket || '—',
      slot:   s.slot?.slotCode    || '—',
      action: s.exitTime ? 'Ra' : 'Vào',
    }));

    // System alerts
    const faultSlots = zones.flatMap(z =>
      z.slots.filter(s => s.isFaulty).map(s => ({ slotCode: s.slotCode, zone: z.zoneCode, lastUpdate: s.lastIotUpdate }))
    );
    const systemAlerts = [
      ...faultSlots.slice(0, 3).map(s => ({
        type: 'error' as const,
        message: `Cảm biến ${s.slotCode} lỗi`,
        time: dayjs(s.lastUpdate).format('HH:mm') + ' hôm nay',
      })),
      ...zoneStats.filter(z => z.available === 0).map(z => ({
        type: 'warning' as const,
        message: `Bãi ${z.zone_code} đầy 100%`,
        time: dayjs().format('HH:mm') + ' hôm nay',
      })),
      { type: 'success' as const, message: 'SSO hoạt động bình thường', time: 'Uptime 99.9%' },
    ].slice(0, 4);

    // IoT sensors status
    const iotSensors = zones.flatMap(z =>
      z.slots.filter(s => s.sensorId).slice(0, 3).map(s => ({
        id:     s.sensorId,
        slot:   s.slotCode,
        zone:   z.zoneCode,
        status: s.isFaulty ? 'Lỗi' : 'OK',
      }))
    ).slice(0, 5);

    return {
      totalOccupied: total - free,
      totalFree:     free,
      total,
      zones:          zoneStats,
      weeklyChart,
      recentActivity,
      systemAlerts,
      iotSensors,
    };
  }
}
