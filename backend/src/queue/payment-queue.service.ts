/**
 * src/queue/payment-queue.service.ts
 *
 * Hàng đợi BKPay đơn giản dùng MSSQL (table PaymentJob).
 * Lý do dùng DB queue thay vì BullMQ/Redis:
 *   - Không phụ thuộc thêm service Redis
 *   - Persist qua restart
 *   - Đủ cho MVP với volume thấp
 *
 * Flow:
 *   1. enqueue(paymentId)  → INSERT job PENDING
 *   2. processQueue()       → cron mỗi 30s, lấy jobs sẵn sàng, gọi BKPay
 *   3. Fail → tăng attempts, lên lịch retry với exponential backoff
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../config/prisma.service';

@Injectable()
export class PaymentQueueService {
  private readonly logger = new Logger(PaymentQueueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Đẩy payment vào queue
   */
  async enqueue(paymentId: number) {
    const job = await this.prisma.paymentJob.create({
      data: { paymentId, status: 'PENDING', nextRunAt: new Date() },
    });
    this.logger.log(`📥 Enqueued job #${job.id} for payment #${paymentId}`);
    return job;
  }

  /**
   * Xử lý queue – chạy mỗi 30 giây
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async processQueue() {
    const now = new Date();
    const jobs = await this.prisma.paymentJob.findMany({
      where: {
        status: 'PENDING',
        nextRunAt: { lte: now },
      },
      take: 10,
    });
    if (jobs.length === 0) return;

    this.logger.log(`⚙️  Processing ${jobs.length} payment jobs`);

    for (const job of jobs) {
      try {
        // Mark RUNNING
        await this.prisma.paymentJob.update({
          where: { id: job.id },
          data: { status: 'RUNNING', attempts: job.attempts + 1 },
        });

        await this.callBKPay(job.paymentId);

        // Success
        await this.prisma.paymentJob.update({
          where: { id: job.id },
          data: { status: 'DONE' },
        });
        this.logger.log(`✅ Job #${job.id} done (payment #${job.paymentId})`);
      } catch (err: any) {
        const attempts = job.attempts + 1;
        const fatal = attempts >= job.maxAttempts;
        const backoffMs = Math.min(60_000 * Math.pow(2, attempts), 600_000); // max 10 min

        await this.prisma.paymentJob.update({
          where: { id: job.id },
          data: {
            status:    fatal ? 'FAILED' : 'PENDING',
            lastError: err.message,
            nextRunAt: fatal ? new Date() : new Date(Date.now() + backoffMs),
          },
        });

        if (fatal) {
          await this.prisma.payment.update({
            where: { id: job.paymentId },
            data: { status: 'FAILED', lastError: err.message, }
          });
          this.logger.error(`❌ Job #${job.id} failed permanently: ${err.message}`);
        } else {
          this.logger.warn(`⏳ Job #${job.id} retry in ${backoffMs / 1000}s (${attempts}/${job.maxAttempts})`);
        }
      }
    }
  }

  /**
   * Gọi mock BKPay API (production: thay bằng axios.post)
   * Mock: 600ms delay, 80% success rate (để test retry)
   */
  private async callBKPay(paymentId: number) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new Error(`Payment #${paymentId} not found`);

    if (this.config.get('NODE_ENV') !== 'production') {
      await new Promise(r => setTimeout(r, 600));
      // 80% success để dễ test retry
      if (Math.random() > 0.8) throw new Error('BKPay timeout (mock)');

      const txnId = `BKP-${Date.now().toString().slice(-8)}`;
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          bkpayTxnId: txnId,
          status:     'SUCCESS',
          paidAt:     new Date(),
          paymentUrl: `https://bkpay.hcmut.edu.vn/pay/${txnId}`,
        },
      });

      await this.prisma.systemLog.create({
        data: {
          eventType: 'payment',
          userId: payment.userId,
          userName: 'BKPay',
          description: `Thanh toán thành công ${txnId} – ${payment.amount}đ`,
        },
      });
    } else {
      // TODO: production – gọi BKPay thật bằng axios
      throw new Error('BKPay production integration TODO');
    }
  }
}
