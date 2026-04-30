/**
 * billing-calculator.ts
 * Tính phí gửi xe theo khung giờ - HCMUT Smart Parking
 *
 * ┌──────────────────────────────────────────────────────────┐
 * │  CHIẾN LƯỢC: Block-based Accumulation (cộng dồn khung)  │
 * │                                                          │
 * │  Mỗi ngày dương lịch chia thành các "slot" giờ cố định. │
 * │  Nếu xe đỗ trong BẤT KỲ phần nào của một slot, phí của │
 * │  slot đó được cộng vào tổng — không tính theo số giờ.   │
 * │                                                          │
 * │  Ví dụ: Gửi 17:00 → 19:00 Thứ 2                        │
 * │    • Slot ban ngày  06:00-18:00 → 2.000 ✓ (có giao)    │
 * │    • Slot ban đêm   18:00-24:00 → 3.000 ✓ (có giao)    │
 * │    → Tổng: 5.000 VNĐ                                    │
 * │                                                          │
 * │  Lý do chọn cách này cho bãi xe đại học:               │
 * │  - Công bằng hơn "chỉ tính giờ check-in" khi xe ở lại │
 * │    qua đêm hoặc vắt sang khung giá cao hơn.            │
 * │  - Đơn giản hơn tính theo từng giờ (per-minute).       │
 * │  - Dễ giải thích cho người dùng: bạn đỗ qua bao nhiêu │
 * │    khung giờ thì trả bấy nhiêu mức phí.                │
 * └──────────────────────────────────────────────────────────┘
 */

import dayjs from 'dayjs';

// ─── Cấu hình giá (có thể thay đổi mà không cần sửa logic) ───────────────────

export interface PricingConfig {
  /** Giờ bắt đầu ban ngày (inclusive), mặc định 6 → 06:00 */
  dayStartHour: number;
  /** Giờ bắt đầu ban đêm (inclusive), mặc định 18 → 18:00 */
  nightStartHour: number;
  /** Phí ban ngày Thứ 2 – Thứ 7 (VNĐ/slot) */
  weekdayDayFee: number;
  /** Phí ban đêm Thứ 2 – Thứ 7 (VNĐ/slot) */
  weekdayNightFee: number;
  /** Phí Chủ Nhật áp dụng cả ngày (VNĐ/slot) */
  sundayFee: number;
}

/**
 * Mock PricingPolicies — Admin có thể cập nhật object này qua API PUT /admin/pricing
 * mà không cần sửa bất kỳ dòng logic nào bên dưới.
 */
export const PRICING_POLICIES: Record<string, PricingConfig> = {
  /** Bảng giá hiện hành (2025) */
  current: {
    dayStartHour:     6,
    nightStartHour:   18,
    weekdayDayFee:    2_000,
    weekdayNightFee:  3_000,
    sundayFee:        3_000,
  },
  /** Bảng giá thí nghiệm kỳ học hè (ví dụ) */
  summer2025: {
    dayStartHour:     7,
    nightStartHour:   19,
    weekdayDayFee:    1_500,
    weekdayNightFee:  2_500,
    sundayFee:        2_500,
  },
};

// ─── Kiểu nội bộ ──────────────────────────────────────────────────────────────

interface RateSlot {
  start: Date;   // bắt đầu slot (inclusive)
  end:   Date;   // kết thúc slot (exclusive)
  fee:   number; // phí áp dụng nếu xe có mặt trong slot này
  label: string; // mô tả để debug / hiển thị breakdown
}

// ─── Helper thuần ─────────────────────────────────────────────────────────────

/** Lấy mốc 00:00:00 của ngày d */
function startOfDay(d: Date): Date {
  return dayjs(d).startOf('day').toDate();
}

/** Cộng N giờ nguyên vào date */
function addHours(d: Date, h: number): Date {
  return new Date(d.getTime() + h * 3_600_000);
}

/** Hai khoảng [s1,e1) và [s2,e2) có giao nhau không? */
function overlaps(s1: Date, e1: Date, s2: Date, e2: Date): boolean {
  return s1 < e2 && s2 < e1;
}

// ─── Sinh danh sách rate-slot ─────────────────────────────────────────────────

/**
 * Tạo tất cả các slot tính phí bao phủ khoảng [checkIn, checkOut].
 * Mỗi ngày calendar được chia thành 1 hoặc 3 slot tùy là Chủ Nhật hay không.
 */
function generateRateSlots(checkIn: Date, checkOut: Date, cfg: PricingConfig): RateSlot[] {
  const slots: RateSlot[] = [];

  // Duyệt từng ngày dương lịch từ ngày check-in đến ngày check-out
  let cursor = startOfDay(checkIn);
  const lastDay = startOfDay(checkOut);

  while (cursor <= lastDay) {
    const dow = dayjs(cursor).day(); // 0 = Chủ Nhật, 1–6 = Thứ 2–Thứ 7
    const dateLabel = dayjs(cursor).format('DD/MM/YYYY');

    if (dow === 0) {
      // ── Chủ Nhật: 1 slot cả ngày ──
      slots.push({
        start: cursor,
        end:   addHours(cursor, 24),
        fee:   cfg.sundayFee,
        label: `Chủ Nhật ${dateLabel} (00:00–24:00)`,
      });
    } else {
      // ── Thứ 2–Thứ 7: 3 slot ──
      const dayName = ['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][dow];

      // Slot 1: 00:00 → dayStart (đêm muộn — nối tiếp đêm hôm trước)
      if (cfg.dayStartHour > 0) {
        slots.push({
          start: cursor,
          end:   addHours(cursor, cfg.dayStartHour),
          fee:   cfg.weekdayNightFee,
          label: `${dayName} ${dateLabel} đêm sáng sớm (00:00–${cfg.dayStartHour}:00)`,
        });
      }

      // Slot 2: dayStart → nightStart (ban ngày)
      slots.push({
        start: addHours(cursor, cfg.dayStartHour),
        end:   addHours(cursor, cfg.nightStartHour),
        fee:   cfg.weekdayDayFee,
        label: `${dayName} ${dateLabel} ban ngày (${cfg.dayStartHour}:00–${cfg.nightStartHour}:00)`,
      });

      // Slot 3: nightStart → 24:00 (ban đêm)
      slots.push({
        start: addHours(cursor, cfg.nightStartHour),
        end:   addHours(cursor, 24),
        fee:   cfg.weekdayNightFee,
        label: `${dayName} ${dateLabel} ban đêm (${cfg.nightStartHour}:00–24:00)`,
      });
    }

    cursor = dayjs(cursor).add(1, 'day').toDate();
  }

  return slots;
}

// ─── Hàm công khai chính ─────────────────────────────────────────────────────

export interface FeeResult {
  totalFee:  number;
  breakdown: Array<{ label: string; fee: number }>;
}

/**
 * Tính tổng phí gửi xe theo phương pháp cộng dồn khung giờ.
 *
 * @param checkIn   - Thời điểm xe vào bãi
 * @param checkOut  - Thời điểm xe ra bãi
 * @param config    - Cấu hình bảng giá (mặc định: PRICING_POLICIES.current)
 */
export function calculateParkingFee(
  checkIn:  Date,
  checkOut: Date,
  config:   PricingConfig = PRICING_POLICIES.current,
): FeeResult {
  if (checkOut <= checkIn) {
    throw new Error('checkOut phải sau checkIn');
  }

  const slots = generateRateSlots(checkIn, checkOut, config);
  const breakdown: Array<{ label: string; fee: number }> = [];
  let totalFee = 0;

  for (const slot of slots) {
    if (overlaps(checkIn, checkOut, slot.start, slot.end)) {
      totalFee += slot.fee;
      breakdown.push({ label: slot.label, fee: slot.fee });
    }
  }

  return { totalFee, breakdown };
}
