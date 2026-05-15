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
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("[Seed] 🌱 Starting...");

  // ─── Cleanup (idempotent) ───
  await prisma.payment.deleteMany();
  await prisma.user.deleteMany();
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
      {
        userRole: "STUDENT",
        ratePerHour: 2500,
        dailyCap: 30000,
        isExempt: false,
      },
      { userRole: "STAFF", ratePerHour: 0, dailyCap: 0, isExempt: true },
      { userRole: "OPERATOR", ratePerHour: 0, dailyCap: 0, isExempt: true },
      {
        userRole: "visitor_motorbike",
        ratePerHour: 5000,
        dailyCap: 0,
        isExempt: false,
      },
      {
        userRole: "visitor_car",
        ratePerHour: 15000,
        dailyCap: 0,
        isExempt: false,
      },
    ],
  });
  console.log("[Seed] ✓ Pricing policies (5)");

  // ─── 2. Users (mock HCMUT_DATACORE) ───
  // Password mặc định cho tất cả: "123456" (chỉ dùng demo!)
  const passwordHash = await bcrypt.hash("123456", 10);
  const users = [
    {
      hcmutId: "2211001",
      rfidCard: "RFID-001",
      fullName: "Nguyễn Văn An",
      email: "an.nv@hcmut.edu.vn",
      phone: "0901234567",
      department: "Khoa CNTT",
      role: "STUDENT",
      feeTier: "STANDARD",
      licensePlate: "29A-12345",
    },
    {
      hcmutId: "2211002",
      rfidCard: "RFID-002",
      fullName: "Trần Thị Bảo",
      email: "bao.tt@hcmut.edu.vn",
      phone: "0901234568",
      department: "Khoa Điện-Điện tử",
      role: "STUDENT",
      feeTier: "STANDARD",
      licensePlate: "29B-67890",
    },
    {
      hcmutId: "2211003",
      rfidCard: "RFID-003",
      fullName: "Lê Văn Cường",
      email: "cuong.lv@hcmut.edu.vn",
      phone: "0901234569",
      department: "Khoa CNTT",
      role: "STUDENT",
      feeTier: "STANDARD",
      licensePlate: "30A-11111",
    },
    {
      hcmutId: "GV-045",
      rfidCard: "RFID-004",
      fullName: "TS. Phạm Minh",
      email: "minh.pm@hcmut.edu.vn",
      phone: "0901234570",
      department: "Khoa CNTT",
      role: "STAFF",
      feeTier: "EXEMPT",
      licensePlate: "51A-11100",
    },
    {
      hcmutId: "OP-001",
      rfidCard: "RFID-005",
      fullName: "Nguyễn Bảo Vệ",
      email: "baove.nv@hcmut.edu.vn",
      phone: "0901234571",
      department: "Bảo vệ",
      role: "OPERATOR",
      feeTier: "EXEMPT",
      licensePlate: "29D-33333",
    },
    {
      hcmutId: "AD-001",
      rfidCard: "RFID-006",
      fullName: "Admin HCMUT",
      email: "admin@hcmut.edu.vn",
      phone: "0901234572",
      department: "Phòng Đào tạo",
      role: "ADMIN",
      feeTier: "EXEMPT",
      licensePlate: "29E-44444",
    },
  ];
  const userIdByHcmutId = new Map<string, number>();
  for (const u of users) {
    const created = await prisma.user.create({ data: { ...u, passwordHash } });
    userIdByHcmutId.set(u.hcmutId, created.id);
  }
  console.log("[Seed] ✓ Users (6) – mật khẩu mặc định: 123456");

  // ─── 3. Parking Zones & Slots ───
  const zones = [
    { code: "A", name: "Bãi A – Tòa B1", total: 48 },
    { code: "B", name: "Bãi B – Tòa B4", total: 60 },
    { code: "C", name: "Bãi C – Ký túc xá", total: 40 },
  ];

  for (const z of zones) {
    const zone = await prisma.parkingZone.create({
      data: { zoneCode: z.code, zoneName: z.name, totalSlots: z.total },
    });
    const freeCount = z.code === "A" ? 32 : z.code === "B" ? 8 : 0;
    const slotData = Array.from({ length: z.total }, (_, i) => {
      const code = `${z.code}${String(i + 1).padStart(2, "0")}`;
      return {
        zoneId: zone.id,
        slotCode: code,
        sensorId: `SENSOR-${code}`,
        status: i < freeCount ? "AVAILABLE" : "OCCUPIED",
        rowNumber: Math.ceil((i + 1) / 10),
      };
    });
    await prisma.parkingSlot.createMany({ data: slotData });
  }
  console.log("[Seed] ✓ Parking zones (3) + slots (148)");

  // Lấy slot IDs để gán cho sessions
  const slotsA = await prisma.parkingSlot.findMany({ where: { zone: { zoneCode: "A" } }, orderBy: { slotCode: "asc" } });
  const slotsB = await prisma.parkingSlot.findMany({ where: { zone: { zoneCode: "B" } }, orderBy: { slotCode: "asc" } });

  const user1Id = userIdByHcmutId.get("2211001")!;
  const user2Id = userIdByHcmutId.get("2211002")!;
  const user3Id = userIdByHcmutId.get("2211003")!;

  const d = (daysAgo: number, h = 8, m = 0) => {
    const t = new Date("2026-05-15T00:00:00+07:00");
    t.setDate(t.getDate() - daysAgo);
    t.setHours(h, m, 0, 0);
    return t;
  };

  // ─── 4. Parking Sessions (lịch sử 15 ngày + 2 ACTIVE hôm nay) ───
  await prisma.parkingSession.createMany({
    data: [
      // Hôm nay – ACTIVE (2 xe đang trong bãi)
      { userId: user1Id, slotId: slotsA[0].id, entryGate: "GATE-A", entryTime: d(0, 7, 30), status: "ACTIVE",  billingPeriod: "2026-05" },
      { userId: user2Id, slotId: slotsA[1].id, entryGate: "GATE-A", entryTime: d(0, 8, 15), status: "ACTIVE",  billingPeriod: "2026-05" },
      // Hôm nay – đã ra
      { userId: user3Id, slotId: slotsB[0].id, entryGate: "GATE-B", entryTime: d(0, 6, 0),  exitTime: d(0, 11, 45), exitGate: "GATE-B", durationMinutes: 345, status: "CLOSED", billingPeriod: "2026-05" },
      // Hôm qua
      { userId: user1Id, slotId: slotsA[2].id, entryGate: "GATE-A", entryTime: d(1, 7, 0),  exitTime: d(1, 17, 30), exitGate: "GATE-A", durationMinutes: 630, status: "CLOSED", billingPeriod: "2026-05" },
      { userId: user2Id, slotId: slotsA[3].id, entryGate: "GATE-A", entryTime: d(1, 8, 0),  exitTime: d(1, 16, 0),  exitGate: "GATE-A", durationMinutes: 480, status: "CLOSED", billingPeriod: "2026-05" },
      { userId: user3Id, slotId: slotsB[1].id, entryGate: "GATE-B", entryTime: d(1, 9, 0),  exitTime: d(1, 12, 30), exitGate: "GATE-B", durationMinutes: 210, status: "CLOSED", billingPeriod: "2026-05" },
      // 3 ngày trước
      { userId: user1Id, slotId: slotsA[0].id, entryGate: "GATE-A", entryTime: d(3, 7, 45), exitTime: d(3, 18, 0),  exitGate: "GATE-A", durationMinutes: 615, status: "CLOSED", billingPeriod: "2026-05" },
      { userId: user3Id, slotId: slotsB[2].id, entryGate: "GATE-B", entryTime: d(3, 8, 30), exitTime: d(3, 11, 0),  exitGate: "GATE-B", durationMinutes: 150, status: "CLOSED", billingPeriod: "2026-05" },
      // 1 tuần trước
      { userId: user1Id, slotId: slotsA[1].id, entryGate: "GATE-A", entryTime: d(7, 7, 0),  exitTime: d(7, 17, 0),  exitGate: "GATE-A", durationMinutes: 600, status: "CLOSED", billingPeriod: "2026-05" },
      { userId: user2Id, slotId: slotsA[4].id, entryGate: "GATE-A", entryTime: d(7, 8, 0),  exitTime: d(7, 15, 30), exitGate: "GATE-A", durationMinutes: 450, status: "CLOSED", billingPeriod: "2026-05" },
      { userId: user3Id, slotId: slotsB[3].id, entryGate: "GATE-B", entryTime: d(7, 9, 0),  exitTime: d(7, 13, 0),  exitGate: "GATE-B", durationMinutes: 240, status: "CLOSED", billingPeriod: "2026-05" },
      // Tháng trước (2026-04)
      { userId: user1Id, slotId: slotsA[0].id, entryGate: "GATE-A", entryTime: d(20, 7, 0), exitTime: d(20, 17, 0), exitGate: "GATE-A", durationMinutes: 600, status: "CLOSED", billingPeriod: "2026-04" },
      { userId: user2Id, slotId: slotsA[1].id, entryGate: "GATE-A", entryTime: d(22, 8, 0), exitTime: d(22, 16, 0), exitGate: "GATE-A", durationMinutes: 480, status: "CLOSED", billingPeriod: "2026-04" },
      { userId: user1Id, slotId: slotsA[2].id, entryGate: "GATE-A", entryTime: d(25, 7, 0), exitTime: d(25, 18, 0), exitGate: "GATE-A", durationMinutes: 660, status: "CLOSED", billingPeriod: "2026-04" },
    ],
  });
  console.log("[Seed] ✓ Parking sessions (14)");

  // ─── 5. Visitor Tickets ───
  const opId = userIdByHcmutId.get("OP-001")!;
  await prisma.visitorTicket.createMany({
    data: [
      { ticketCode: "VT-000001", licensePlate: "29A-99001", vehicleType: "motorbike", visitorName: "Nguyễn Khách A", issuedById: opId, entryTime: d(0, 8, 0),  expiryTime: d(0, 10, 0), feeAmount: 10000, isActive: false, exitTime: d(0, 9, 45) },
      { ticketCode: "VT-000002", licensePlate: "51A-11222", vehicleType: "car",       visitorName: "Trần Khách B",   issuedById: opId, entryTime: d(0, 9, 0),  expiryTime: d(0, 11, 0), feeAmount: 30000, isActive: true },
      { ticketCode: "VT-000003", licensePlate: "30A-33333", vehicleType: "motorbike", visitorName: "Lê Khách C",    issuedById: opId, entryTime: d(1, 14, 0), expiryTime: d(1, 16, 0), feeAmount: 10000, isActive: false, exitTime: d(1, 15, 50) },
      { ticketCode: "VT-000004", licensePlate: "29B-55555", vehicleType: "bicycle",   visitorName: "Phạm Khách D",  issuedById: opId, entryTime: d(2, 7, 30), expiryTime: d(2, 9, 30), feeAmount: 4000,  isActive: false, exitTime: d(2, 9, 10) },
      { ticketCode: "VT-000005", licensePlate: "51B-77777", vehicleType: "car",       visitorName: "Hoàng Khách E", issuedById: opId, entryTime: d(0, 10, 0), expiryTime: d(0, 12, 0), feeAmount: 30000, isActive: true },
    ],
  });
  console.log("[Seed] ✓ Visitor tickets (5)");

  // ─── 6. Payments ───
  await prisma.payment.createMany({
    data: [
      // Tháng 03/2026 – đã thanh toán
      { userId: user1Id, billingPeriod: "2026-03", totalDuration: 1800, amount: 75000, status: "SUCCESS", bkpayTxnId: "BKP-20260331-001", paidAt: new Date("2026-03-31T23:30:00Z") },
      { userId: user2Id, billingPeriod: "2026-03", totalDuration: 1500, amount: 62500, status: "SUCCESS", bkpayTxnId: "BKP-20260331-002", paidAt: new Date("2026-03-31T23:35:00Z") },
      { userId: user3Id, billingPeriod: "2026-03", totalDuration: 960,  amount: 40000, status: "SUCCESS", bkpayTxnId: "BKP-20260331-003", paidAt: new Date("2026-03-31T23:40:00Z") },
      // Tháng 04/2026 – đã thanh toán
      { userId: user1Id, billingPeriod: "2026-04", totalDuration: 1560, amount: 65000, status: "SUCCESS", bkpayTxnId: "BKP-20260430-001", paidAt: new Date("2026-04-30T23:30:00Z") },
      { userId: user2Id, billingPeriod: "2026-04", totalDuration: 1200, amount: 50000, status: "SUCCESS", bkpayTxnId: "BKP-20260430-002", paidAt: new Date("2026-04-30T23:35:00Z") },
      { userId: user3Id, billingPeriod: "2026-04", totalDuration: 720,  amount: 30000, status: "SUCCESS", bkpayTxnId: "BKP-20260430-003", paidAt: new Date("2026-04-30T23:40:00Z") },
      // Tháng 05/2026 – đang chạy (PENDING)
      { userId: user1Id, billingPeriod: "2026-05", totalDuration: 1245, amount: 51875, status: "PENDING" },
      { userId: user2Id, billingPeriod: "2026-05", totalDuration: 930,  amount: 38750, status: "PENDING" },
      { userId: user3Id, billingPeriod: "2026-05", totalDuration: 695,  amount: 28958, status: "PENDING" },
    ],
  });
  console.log("[Seed] ✓ Payments (9) – 6 SUCCESS, 3 PENDING tháng 05");

  // ─── 7. System Log ───
  const now = new Date("2026-05-15T10:00:00+07:00");
  await prisma.systemLog.createMany({
    data: [
      { eventType: "admin",   userName: "System",          description: "Hệ thống khởi động – Seed hoàn tất", status: "OK",   createdAt: new Date(now.getTime() - 86_400_000 * 7) },
      { eventType: "entry",   userName: "Nguyễn Văn An",   description: "Vào bãi A – Cổng GATE-A – Slot A01", status: "OK",   createdAt: new Date(now.getTime() - 86_400_000 * 3) },
      { eventType: "entry",   userName: "Trần Thị Bảo",    description: "Vào bãi A – Cổng GATE-A – Slot A02", status: "OK",   createdAt: new Date(now.getTime() - 86_400_000 * 3 + 3_600_000) },
      { eventType: "exit",    userName: "Lê Văn Cường",    description: "Ra bãi B – 210 phút",                status: "OK",   createdAt: new Date(now.getTime() - 86_400_000 * 3 + 7_200_000) },
      { eventType: "fault",   userName: "SENSOR-B05",      description: "Cảm biến B05 báo lỗi",              status: "WARN", createdAt: new Date(now.getTime() - 86_400_000 * 2) },
      { eventType: "fault",   userName: "SENSOR-B05",      description: "Khôi phục cảm biến B05",            status: "OK",   createdAt: new Date(now.getTime() - 86_400_000 * 2 + 1_800_000) },
      { eventType: "payment", userName: "Nguyễn Văn An",   description: "BKPay BKP-20260430-001 – 65,000đ",  status: "OK",   createdAt: new Date(now.getTime() - 86_400_000 * 15) },
      { eventType: "payment", userName: "Trần Thị Bảo",    description: "BKPay BKP-20260430-002 – 50,000đ",  status: "OK",   createdAt: new Date(now.getTime() - 86_400_000 * 15 + 300_000) },
      { eventType: "visitor", userName: "Nguyễn Bảo Vệ",   description: "Cấp vé VT-000001 – 29A-99001 – 10,000đ", status: "OK", createdAt: new Date(now.getTime() - 7_200_000) },
      { eventType: "visitor", userName: "Nguyễn Bảo Vệ",   description: "Cấp vé VT-000002 – 51A-11222 – 30,000đ", status: "OK", createdAt: new Date(now.getTime() - 3_600_000) },
      { eventType: "entry",   userName: "Nguyễn Văn An",   description: "Vào bãi A – Cổng GATE-A – Slot A01 (đặt trước)", status: "OK", createdAt: new Date(now.getTime() - 1_800_000) },
      { eventType: "entry",   userName: "Trần Thị Bảo",    description: "Vào bãi A – Cổng GATE-A – Slot A02", status: "OK",  createdAt: new Date(now.getTime() - 900_000) },
      { eventType: "admin",   userName: "Admin HCMUT",      description: "Cập nhật chính sách phí: STUDENT 2,500đ/h", status: "OK", createdAt: new Date(now.getTime() - 600_000) },
      { eventType: "exit",    userName: "Lê Văn Cường",    description: "Ra bãi B – Cổng GATE-B – 345 phút", status: "OK",  createdAt: new Date(now.getTime() - 300_000) },
    ],
  });
  console.log("[Seed] ✓ System log (14)");

  console.log("\n[Seed] ✅ Done!\n");
  console.log("  Login với:");
  console.log("  - Sinh viên : 2211001 / 123456");
  console.log("  - Giảng viên: GV-045 / 123456");
  console.log("  - Bảo vệ    : OP-001 / 123456");
  console.log("  - Admin     : AD-001 / 123456\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
