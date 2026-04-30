/**
 * src/modules/parking/parking.controller.ts
 * UC-1: Check-in / Check-out
 */
import { Body, Controller, Get, Post, Param, Req } from '@nestjs/common';
import { ParkingService } from './parking.service';
import { CheckInDto, CheckOutDto } from './parking.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

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
