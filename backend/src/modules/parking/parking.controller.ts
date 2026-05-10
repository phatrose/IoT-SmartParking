/**
 * src/modules/parking/parking.controller.ts
 * UC-1: Check-in / Check-out
 */
import { Body, Controller, Get, Post, Delete, Req } from '@nestjs/common';
import { ParkingService } from './parking.service';
import { CheckInDto, CheckOutDto } from './parking.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { IsNumber } from 'class-validator';

class ReserveDto {
  @IsNumber() slot_id: number;
}

@Controller('api/parking')
export class ParkingController {
  constructor(private readonly parkingService: ParkingService) {}

  /**
   * POST /api/parking/checkin
   * (chỉ Operator/Admin/Gate System được call)
   */
  @Roles('OPERATOR', 'ADMIN')
  @Post('checkin')
  async checkIn(@Body() dto: CheckInDto, @Req() req) {
    return this.parkingService.checkIn({
      rfidCard:  dto.rfid_card,
      gateId:    dto.gate_id,
      slotId:    dto.slot_id ? parseInt(dto.slot_id) : undefined,
      ipAddress: req.ip,
    });
  }

  /**
   * POST /api/parking/checkout
   */
  @Roles('OPERATOR', 'ADMIN')
  @Post('checkout')
  async checkOut(@Body() dto: CheckOutDto, @Req() req) {
    return this.parkingService.checkOut({
      rfidCard:  dto.rfid_card,
      gateId:    dto.gate_id,
      ipAddress: req.ip,
    });
  }

  /**
   * GET /api/parking/reservations  – operator xem ai đang đặt trước
   * GET /api/parking/active-sessions – operator xem xe đang trong bãi
   */
  @Roles('OPERATOR', 'ADMIN')
  @Get('reservations')
  async getReservations() {
    return this.parkingService.getReservations();
  }

  @Roles('OPERATOR', 'ADMIN')
  @Get('active-sessions')
  async getActiveSessions() {
    return this.parkingService.getActiveSessions();
  }

  /**
   * POST /api/parking/checkout-request  – sinh viên báo muốn ra
   * DELETE /api/parking/checkout-request – huỷ yêu cầu
   * GET  /api/parking/checkout-request  – kiểm tra trạng thái
   */
  @Post('checkout-request')
  async requestCheckout(@CurrentUser() user) {
    return this.parkingService.requestCheckout(user.id);
  }

  @Delete('checkout-request')
  async cancelCheckoutRequest(@CurrentUser() user) {
    return this.parkingService.cancelCheckoutRequest(user.id);
  }

  @Get('checkout-request')
  async getCheckoutRequest(@CurrentUser() user) {
    return { pending: this.parkingService.hasCheckoutRequest(user.id) };
  }

  /**
   * POST /api/parking/reserve  – sinh viên đặt slot trước
   * DELETE /api/parking/reserve – huỷ đặt
   */
  @Post('reserve')
  async reserve(@CurrentUser() user, @Body() body: ReserveDto) {
    return this.parkingService.reserve(user.id, body.slot_id);
  }

  @Delete('reserve')
  async cancelReserve(@CurrentUser() user) {
    return this.parkingService.cancelReserve(user.id);
  }

  /**
   * GET /api/parking/me/history
   * Sinh viên/cán bộ xem lịch sử của chính mình
   */
  @Get('me/history')
  async myHistory(@CurrentUser() user) {
    return this.parkingService.getUserHistory(user.id, 50);
  }

  /**
   * GET /api/parking/me/active
   */
  @Get('me/active')
  async myActiveSession(@CurrentUser() user) {
    return this.parkingService.getActiveSession(user.id);
  }
}
