/**
 * src/modules/admin/admin.controller.ts
 */
import { Body, Controller, Get, Post, Put, Query } from '@nestjs/common';
import { IsString, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';
import { AdminService } from './admin.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

export class UpdatePricingDto {
  @IsString() user_role: string;
  @IsNumber() @Min(0) rate_per_hour: number;
  @IsNumber() @Min(0) daily_cap: number;
  @IsOptional() @IsBoolean() is_exempt?: boolean;
}

@Controller('api/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Dashboard – mọi authenticated user xem được
  @Get('dashboard')
  dashboard() {
    return this.adminService.getDashboard();
  }

  @Roles('ADMIN')
  @Get('pricing')
  getPricing() {
    return this.adminService.getPricing();
  }

  @Roles('ADMIN')
  @Put('pricing')
  upsertPricing(@Body() dto: UpdatePricingDto, @CurrentUser() user) {
    return this.adminService.upsertPricing(dto, user.id);
  }

  @Roles('ADMIN', 'OPERATOR')
  @Get('logs')
  getLogs(@Query('type') type?: string, @Query('limit') limit?: string) {
    return this.adminService.getLogs({ type, limit: limit ? parseInt(limit) : 100 });
  }

  @Roles('ADMIN', 'OPERATOR')
  @Get('users')
  getUsers(@Query('role') role?: string, @Query('q') q?: string) {
    return this.adminService.getUsers({ role, search: q });
  }

  @Roles('ADMIN')
  @Post('sync-datacore')
  syncDatacore(@CurrentUser() user) {
    return this.adminService.syncDatacore(user.id);
  }

  @Roles('ADMIN')
  @Get('report')
  getReport(@Query('period') period?: string) {
    return this.adminService.getReport(period ?? new Date().toISOString().slice(0, 7));
  }
}
