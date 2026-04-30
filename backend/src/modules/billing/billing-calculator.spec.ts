/**
 * billing-calculator.spec.ts
 * Test cases cho hàm calculateParkingFee
 * Chạy: npx ts-node src/modules/billing/billing-calculator.spec.ts
 */

import { calculateParkingFee, PRICING_POLICIES } from './billing-calculator';

const cfg = PRICING_POLICIES.current;

// ─── Helper hiển thị kết quả ─────────────────────────────────────────────────

function run(name: string, checkIn: Date, checkOut: Date, expected: number) {
  const result = calculateParkingFee(checkIn, checkOut, cfg);

  const pass = result.totalFee === expected;
  const icon = pass ? '✅' : '❌';

  console.log(`\n${icon} [${name}]`);
  console.log(`   Check-in : ${checkIn.toLocaleString('vi-VN')}`);
  console.log(`   Check-out: ${checkOut.toLocaleString('vi-VN')}`);
  console.log(`   Kỳ vọng  : ${expected.toLocaleString('vi-VN')} VNĐ`);
  console.log(`   Thực tế  : ${result.totalFee.toLocaleString('vi-VN')} VNĐ`);
  console.log('   Chi tiết:');
  for (const b of result.breakdown) {
    console.log(`     • ${b.label} → ${b.fee.toLocaleString('vi-VN')} VNĐ`);
  }

  if (!pass) {
    console.error(`   ⚠️  THẤT BẠI: chênh lệch ${result.totalFee - expected} VNĐ`);
  }
}

// ─── TC-1: Gửi ban ngày Thứ 2 ─────────────────────────────────────────────
// 08:00 → 09:30 Thứ 2 → chỉ rơi vào slot ban ngày (06:00–18:00)
// → 2.000 VNĐ
run(
  'TC-1: Ban ngày Thứ 2 (08:00–09:30)',
  new Date('2025-07-07T08:00:00'),   // 07/07/2025 = Thứ 2
  new Date('2025-07-07T09:30:00'),
  2_000,
);

// ─── TC-2: Gửi ban đêm Thứ 6 ─────────────────────────────────────────────
// 20:00 → 21:30 Thứ 6 → chỉ rơi vào slot ban đêm (18:00–24:00)
// → 3.000 VNĐ
run(
  'TC-2: Ban đêm Thứ 6 (20:00–21:30)',
  new Date('2025-07-11T20:00:00'),   // 11/07/2025 = Thứ 6
  new Date('2025-07-11T21:30:00'),
  3_000,
);

// ─── TC-3: Gửi Chủ Nhật ──────────────────────────────────────────────────
// 10:00 → 12:00 Chủ Nhật → slot cả ngày Chủ Nhật (00:00–24:00)
// → 3.000 VNĐ
run(
  'TC-3: Chủ Nhật (10:00–12:00)',
  new Date('2025-07-13T10:00:00'),   // 13/07/2025 = Chủ Nhật
  new Date('2025-07-13T12:00:00'),
  3_000,
);

// ─── TC-4: Vắt ngang khung giờ Thứ 2 (17:00 → 19:00) ────────────────────
// 17:00–18:00: thuộc slot ban ngày (06:00–18:00) → 2.000
// 18:00–19:00: thuộc slot ban đêm (18:00–24:00)  → 3.000
// → 5.000 VNĐ
run(
  'TC-4: Vắt khung Thứ 2 (17:00–19:00)',
  new Date('2025-07-07T17:00:00'),
  new Date('2025-07-07T19:00:00'),
  5_000,
);

// ─── TC-5: Gửi qua đêm Thứ 7 → Chủ Nhật ─────────────────────────────────
// Thứ 7 22:00 → Chủ Nhật 09:00
//   Thứ 7 ban đêm (18:00–24:00) → 3.000  ✓ giao
//   Chủ Nhật cả ngày (00:00–24:00) → 3.000  ✓ giao
// → 6.000 VNĐ
run(
  'TC-5: Qua đêm Thứ 7 → Chủ Nhật (22:00–09:00)',
  new Date('2025-07-12T22:00:00'),   // 12/07/2025 = Thứ 7
  new Date('2025-07-13T09:00:00'),   // 13/07/2025 = Chủ Nhật
  6_000,
);

// ─── TC-BONUS: Gửi qua đêm Chủ Nhật → Thứ 2 ─────────────────────────────
// Chủ Nhật 23:00 → Thứ 2 08:00
//   CN cả ngày (00:00–24:00)          → 3.000  ✓
//   T2 đêm sáng sớm (00:00–06:00)     → 3.000  ✓
//   T2 ban ngày (06:00–18:00)          → 2.000  ✓
// → 8.000 VNĐ
run(
  'TC-BONUS: Qua đêm Chủ Nhật → Thứ 2 (23:00–08:00)',
  new Date('2025-07-13T23:00:00'),   // CN
  new Date('2025-07-14T08:00:00'),   // Thứ 2
  8_000,
);

console.log('\n─────────────────────────────────────────');
console.log('Hoàn thành chạy test cases billing-calculator');
