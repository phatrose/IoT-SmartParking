/**
 * src/modules/visitor/visitor.service.ts
 * UC-2: Cấp vé tạm thời cho khách vãng lai
 */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import dayjs from 'dayjs';

@Injectable()
export class VisitorService {
  constructor(private readonly prisma: PrismaService) {}

  async issueTicket(params: {
    licensePlate: string;
    vehicleType: string;
    visitorName?: string;
    durationHours: number;
    operatorId: number;
  }) {
    if (!params.licensePlate?.trim()) throw new BadRequestException('Thiếu biển số xe');

    // Lấy pricing policy
    const policyRole = `visitor_${params.vehicleType === 'car' ? 'car' : 'motorbike'}`;
    const policy = await this.prisma.pricingPolicy.findUnique({ where: { userRole: policyRole } });
    const fee = (policy ? Number(policy.ratePerHour) : 5000) * params.durationHours;

    const ticketCode = `VT-${Date.now().toString().slice(-7)}`;
    const expiry = dayjs().add(params.durationHours, 'hour').toDate();

    const ticket = await this.prisma.visitorTicket.create({
      data: {
        ticketCode,
        licensePlate: params.licensePlate.toUpperCase(),
        vehicleType: params.vehicleType,
        visitorName: params.visitorName,
        issuedById: params.operatorId,
        expiryTime: expiry,
        feeAmount: fee,
      },
    });

    await this.prisma.systemLog.create({
      data: {
        eventType: 'visitor',
        userId: params.operatorId,
        userName: params.visitorName ?? 'Khách',
        description: `Cấp vé ${ticketCode} – ${params.licensePlate} – ${fee.toLocaleString('vi-VN')}đ`,
      },
    });

    return {
      success: true,
      ticket_code: ticketCode,
      expiry_time: expiry.toISOString(),
      fee_preview: fee,
      message: `Vé ${ticketCode} đã cấp – Mở cổng`,
    };
  }

  async checkout(ticketCode: string) {
    const ticket = await this.prisma.visitorTicket.findUnique({ where: { ticketCode } });
    if (!ticket || !ticket.isActive) throw new NotFoundException('Vé không tồn tại hoặc đã sử dụng');

    const minutes = dayjs().diff(dayjs(ticket.entryTime), 'minute');
    const policyRole = `visitor_${ticket.vehicleType === 'car' ? 'car' : 'motorbike'}`;
    const policy = await this.prisma.pricingPolicy.findUnique({ where: { userRole: policyRole } });
    const hours = minutes / 60;
    const fee = policy ? Math.round(Number(policy.ratePerHour) * hours) : Number(ticket.feeAmount);

    await this.prisma.visitorTicket.update({
      where: { ticketCode },
      data: { isActive: false, exitTime: new Date(), feeAmount: fee },
    });

    return { success: true, fee, duration: minutes };
  }

  async listTickets(activeOnly: boolean) {
    return this.prisma.visitorTicket.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
