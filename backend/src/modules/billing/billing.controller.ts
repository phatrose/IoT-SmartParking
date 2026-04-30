/**
 * src/modules/billing/billing.controller.ts
 */
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { IsString } from 'class-validator';
import { BillingService } from './billing.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

export class TriggerBillingDto {
  @IsString() billing_period: string;
}

@Controller('api/billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  /**
   * GET /api/billing/me
   * User xem dư nợ của chính mình
   */
  @Get('me')
  myBilling(@CurrentUser() user, @Query('period') period?: string) {
    return this.billingService.getUserSummary(user.id, period);
  }

  /**
   * POST /api/billing/pay/:id
   * Trả tiền payment (qua queue + retry)
   */
  @Post('pay/:id')
  payNow(@Param('id') id: string) {
    return this.billingService.payNow(parseInt(id));
  }

  /**
   * POST /api/billing/cycle (Admin only)
   */
  @Roles('ADMIN')
  @Post('cycle')
  triggerCycle(@Body() dto: TriggerBillingDto) {
    return this.billingService.runBillingCycle(dto.billing_period);
  }

  /**
   * GET /api/billing/payments (Admin only)
   */
  @Roles('ADMIN')
  @Get('payments')
  getAll(@Query('status') status?: string, @Query('period') period?: string) {
    return this.billingService.getAllPayments({ status, period });
  }
}
