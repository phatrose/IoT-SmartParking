/**
 * src/modules/billing/billing.service.ts
 * UC-4: Billing & BKPay
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { PaymentQueueService } from '../../queue/payment-queue.service';
import dayjs from 'dayjs';
import { calculateParkingFee, PRICING_POLICIES } from './billing-calculator';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: PaymentQueueService,
  ) {}

  /**
   * Tổng hợp phí định kỳ cho một billing period (chỉ STUDENT)
   */
  async runBillingCycle(billingPeriod: string) {
    this.logger.log(`📊 Running billing cycle for ${billingPeriod}`);

    const students = await this.prisma.user.findMany({
      where: { role: 'STUDENT', isActive: true },
    });

    const policy = await this.prisma.pricingPolicy.findUnique({ where: { userRole: 'STUDENT' } });
    if (!policy) throw new Error('Pricing policy không tồn tại');

    let processed = 0;
    let total = 0;
    const errors: string[] = [];

    for (const student of students) {
      try {
        // Tổng phút gửi xe trong period
        const sessions = await this.prisma.parkingSession.findMany({
          where: {
            userId:        student.id,
            billingPeriod,
            status:        'CLOSED',
          },
        });
        if (sessions.length === 0) continue;

        // Tính phí từng phiên theo khung giờ rồi cộng dồn
        const pricing = PRICING_POLICIES.current;
        let amount = 0;
        for (const s of sessions) {
          if (s.entryTime && s.exitTime) {
            const { totalFee } = calculateParkingFee(
              new Date(s.entryTime),
              new Date(s.exitTime),
              pricing,
            );
            amount += totalFee;
          }
        }

        // Tạo payment + enqueue
        const payment = await this.prisma.payment.create({
          data: {
            userId:        student.id,
            billingPeriod,
            totalDuration: sessions.reduce((s, x) => s + (x.durationMinutes ?? 0), 0),
            amount,
            status:        'PENDING',
          },
        });

        await this.queue.enqueue(payment.id);

        processed++;
        total += amount;
      } catch (err: any) {
        errors.push(`${student.hcmutId}: ${err.message}`);
      }
    }

    return { success: true, processed, total, period: billingPeriod, errors };
  }

  /**
   * Trigger thanh toán ngay (User action)
   */
  async payNow(paymentId: number) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment không tồn tại');
    if (payment.status === 'SUCCESS') {
      return { success: true, message: 'Đã thanh toán', txn_id: payment.bkpayTxnId };
    }

    // Update status PROCESSING + enqueue
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'PROCESSING' },
    });
    await this.queue.enqueue(paymentId);

    // Đợi ~2 giây để job chạy (cho user feedback nhanh)
    await new Promise(r => setTimeout(r, 1500));

    const updated = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    return {
      success: updated.status === 'SUCCESS',
      status:  updated.status,
      txn_id:  updated.bkpayTxnId,
      message: updated.status === 'SUCCESS'
        ? 'Thanh toán thành công'
        : 'Đang xử lý qua hàng đợi (sẽ retry tự động nếu thất bại)',
    };
  }

  async getUserSummary(userId: number, period?: string) {
    const currentPeriod = period ?? dayjs().format('YYYY-MM');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User không tồn tại');

    const payments = await this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const sessions = await this.prisma.parkingSession.findMany({
      where: { userId, billingPeriod: currentPeriod, status: 'CLOSED' },
    });
    const minutes = sessions.reduce((s, x) => s + (x.durationMinutes ?? 0), 0);

    const policy = await this.prisma.pricingPolicy.findUnique({ where: { userRole: user.role } });
    const isExempt = policy?.isExempt ?? false;
    let estimatedFee = 0;
    if (!isExempt) {
      for (const s of sessions) {
        if (s.entryTime && s.exitTime) {
          estimatedFee += calculateParkingFee(
            new Date(s.entryTime),
            new Date(s.exitTime),
            PRICING_POLICIES.current,
          ).totalFee;
        }
      }
    }

    return {
      user:            { id: user.id, name: user.fullName, role: user.role },
      currentPeriod,
      durationMinutes: minutes,
      estimatedFee:    Math.round(estimatedFee),
      isExempt,
      payments,
    };
  }

  async getAllPayments(filters?: { status?: string; period?: string }) {
    return this.prisma.payment.findMany({
      where: {
        status: filters?.status,
        billingPeriod: filters?.period,
      },
      include: { user: { select: { fullName: true, hcmutId: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
