/**
 * ═══════════════════════════════════════════════════════════
 *  FILE: prisma/seed.ts
 *  Desc: Seed mock data vào MSSQL khi setup DB lần đầu
 *  Run : npm run prisma:seed
 *
 *  Output: 6 users, 3 zones, 148 slots, 5 pricing policies,
 *          5 sample payments, 7 log entries
 * ═══════════════════════════════════════════════════════════
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] 🌱 Starting...');

  // ─── Cleanup (idempotent) ───
  await prisma.systemLog.deleteMany();
  await prisma.paymentJob.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.parkingSession.deleteMany();
  await prisma.visitorTicket.deleteMany();
  await prisma.parkingSlot.deleteMany();
  await prisma.parkingZone.deleteMany();
  await prisma.pricingPolicy.deleteMany();
  await prisma.user.deleteMany();

  // ─── 1. Pricing Policies ───
  await prisma.pricingPolicy.createMany({
    data: [
      { userRole: 'STUDENT',           ratePerHour: 2500,  dailyCap: 30000, isExempt: false },
      { userRole: 'STAFF',             ratePerHour: 0,     dailyCap: 0,     isExempt: true  },
      { userRole: 'OPERATOR',          ratePerHour: 0,     dailyCap: 0,     isExempt: true  },
      { userRole: 'visitor_motorbike', ratePerHour: 5000,  dailyCap: 0,     isExempt: false },
      { userRole: 'visitor_car',       ratePerHour: 15000, dailyCap: 0,     isExempt: false },
    ],
  });
  console.log('[Seed] ✓ Pricing policies (5)');

  // ─── 2. Users (mock HCMUT_DATACORE) ───
  // Password mặc định cho tất cả: "123456" (chỉ dùng demo!)
  const passwordHash = await bcrypt.hash('123456', 10);
  const users = [
    { hcmutId: '2211001', rfidCard: 'RFID-001', fullName: 'Nguyễn Văn An',     email: 'an.nv@hcmut.edu.vn',     phone: '0901234567', department: 'Khoa CNTT',          role: 'STUDENT',  feeTier: 'STANDARD', licensePlate: '29A-12345' },
    { hcmutId: '2211002', rfidCard: 'RFID-002', fullName: 'Trần Thị Bảo',      email: 'bao.tt@hcmut.edu.vn',    phone: '0901234568', department: 'Khoa Điện-Điện tử', role: 'STUDENT',  feeTier: 'STANDARD', licensePlate: '29B-67890' },
    { hcmutId: '2211003', rfidCard: 'RFID-003', fullName: 'Lê Văn Cường',      email: 'cuong.lv@hcmut.edu.vn',  phone: '0901234569', department: 'Khoa CNTT',          role: 'STUDENT',  feeTier: 'STANDARD', licensePlate: '30A-11111' },
    { hcmutId: 'GV-045',  rfidCard: 'RFID-004', fullName: 'TS. Phạm Minh',     email: 'minh.pm@hcmut.edu.vn',   phone: '0901234570', department: 'Khoa CNTT',          role: 'STAFF',    feeTier: 'EXEMPT',   licensePlate: '51A-11100' },
    { hcmutId: 'OP-001',  rfidCard: 'RFID-005', fullName: 'Nguyễn Bảo Vệ',     email: 'baove.nv@hcmut.edu.vn',  phone: '0901234571', department: 'Bảo vệ',             role: 'OPERATOR', feeTier: 'EXEMPT',   licensePlate: '29D-33333' },
    { hcmutId: 'AD-001',  rfidCard: 'RFID-006', fullName: 'Admin HCMUT',       email: 'admin@hcmut.edu.vn',     phone: '0901234572', department: 'Phòng Đào tạo',      role: 'ADMIN',    feeTier: 'EXEMPT',   licensePlate: '29E-44444' },
  ];
  for (const u of users) {
    await prisma.user.create({ data: { ...u, passwordHash } });
  }
  console.log('[Seed] ✓ Users (6) – mật khẩu mặc định: 123456');

  // ─── 3. Parking Zones & Slots ───
  const zones = [
    { code: 'A', name: 'Bãi A – Tòa B1',     total: 48 },
    { code: 'B', name: 'Bãi B – Tòa B4',     total: 60 },
    { code: 'C', name: 'Bãi C – Ký túc xá',  total: 40 },
  ];

  for (const z of zones) {
    const zone = await prisma.parkingZone.create({
      data: { zoneCode: z.code, zoneName: z.name, totalSlots: z.total },
    });
    const freeCount = z.code === 'A' ? 32 : z.code === 'B' ? 8 : 0;
    const slotData = Array.from({ length: z.total }, (_, i) => {
      const code = `${z.code}${String(i + 1).padStart(2, '0')}`;
      return {
        zoneId:    zone.id,
        slotCode:  code,
        sensorId:  `SENSOR-${code}`,
        status:    (i < freeCount ? 'AVAILABLE' : 'OCCUPIED'),
        rowNumber: Math.ceil((i + 1) / 10),
      };
    });
    await prisma.parkingSlot.createMany({ data: slotData });
  }
  console.log('[Seed] ✓ Parking zones (3) + slots (148)');

  // ─── 4. Sample Payments ───
  await prisma.payment.createMany({
    data: [
      { userId: 1, billingPeriod: '2026-03', totalDuration: 1800, amount: 75000, status: 'SUCCESS', bkpayTxnId: 'BKP-12345001', paidAt: new Date('2026-03-31T23:30:00Z') },
      { userId: 1, billingPeriod: '2026-04', totalDuration: 720,  amount: 30000, status: 'PENDING' },
      { userId: 2, billingPeriod: '2026-03', totalDuration: 1500, amount: 62500, status: 'SUCCESS', bkpayTxnId: 'BKP-12345002', paidAt: new Date('2026-03-31T23:35:00Z') },
      { userId: 2, billingPeriod: '2026-04', totalDuration: 600,  amount: 25000, status: 'PENDING' },
      { userId: 3, billingPeriod: '2026-04', totalDuration: 480,  amount: 20000, status: 'PENDING' },
    ],
  });
  console.log('[Seed] ✓ Sample payments (5)');

  // ─── 5. System Log ───
  const now = new Date();
  await prisma.systemLog.createMany({
    data: [
      { eventType: 'admin',   userName: 'System',         description: 'Hệ thống khởi động – Seed hoàn tất',    status: 'OK',   createdAt: new Date(now.getTime() - 720_000) },
      { eventType: 'entry',   userName: 'Nguyễn Văn An',  description: 'Vào bãi A – Slot A14',                  status: 'OK',   createdAt: new Date(now.getTime() - 600_000) },
      { eventType: 'entry',   userName: 'Trần Thị Bảo',   description: 'Vào bãi A – Slot A02',                  status: 'OK',   createdAt: new Date(now.getTime() - 480_000) },
      { eventType: 'exit',    userName: 'Lê Văn Cường',   description: 'Ra bãi A – 65 phút',                    status: 'OK',   createdAt: new Date(now.getTime() - 360_000) },
      { eventType: 'fault',   userName: 'Gateway-B',      description: 'Mất kết nối IoT Gateway B',             status: 'WARN', createdAt: new Date(now.getTime() - 240_000) },
      { eventType: 'payment', userName: 'Nguyễn Văn An',  description: 'BKPay BKP-12345001 – 75,000đ',          status: 'OK',   createdAt: new Date(now.getTime() - 120_000) },
      { eventType: 'visitor', userName: 'Khách',          description: 'Cấp vé VT-000891 – 29A-99999',          status: 'OK',   createdAt: new Date(now.getTime() - 60_000) },
    ],
  });
  console.log('[Seed] ✓ System log (7)');

  console.log('\n[Seed] ✅ Done!\n');
  console.log('  Login với:');
  console.log('  - Sinh viên : 2211001 / 123456');
  console.log('  - Giảng viên: GV-045 / 123456');
  console.log('  - Bảo vệ    : OP-001 / 123456');
  console.log('  - Admin     : AD-001 / 123456\n');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
