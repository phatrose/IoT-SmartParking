/**
 * src/modules/admin/admin.controller.ts
 */
import { Body, Controller, Get, Post, Put, Delete, Param, Query, ParseIntPipe } from '@nestjs/common';
import { IsString, IsNumber, IsOptional, IsBoolean, IsEmail, Min, MinLength } from 'class-validator';
import { AdminService } from './admin.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

export class UpdatePricingDto {
  @IsString() user_role: string;
  @IsNumber() @Min(0) rate_per_hour: number;
  @IsNumber() @Min(0) daily_cap: number;
  @IsOptional() @IsBoolean() is_exempt?: boolean;
}

export class CreateUserDto {
  @IsString() hcmutId: string;
  @IsString() fullName: string;
  @IsString() role: string;
  @IsString() @MinLength(6) password: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() licensePlate?: string;
  @IsOptional() @IsString() department?: string;
}

export class UpdateUserDto {
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() licensePlate?: string;
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() role?: string;
}

export class ResetPasswordDto {
  @IsString() @MinLength(6) newPassword: string;
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
  @Post('users')
  createUser(@Body() dto: CreateUserDto, @CurrentUser() user: any) {
    return this.adminService.createUser(dto, user.id);
  }

  @Roles('ADMIN')
  @Put('users/:id')
  updateUser(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto, @CurrentUser() user: any) {
    return this.adminService.updateUser(id, dto, user.id);
  }

  @Roles('ADMIN')
  @Delete('users/:id')
  deleteUser(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.adminService.deleteUser(id, user.id);
  }

  @Roles('ADMIN')
  @Post('users/:id/reset-password')
  resetPassword(@Param('id', ParseIntPipe) id: number, @Body() dto: ResetPasswordDto, @CurrentUser() user: any) {
    return this.adminService.resetPassword(id, dto.newPassword, user.id);
  }

  @Roles('ADMIN')
  @Post('sync-datacore')
  syncDatacore(@CurrentUser() user: any) {
    return this.adminService.syncDatacore(user.id);
  }

  @Roles('ADMIN')
  @Get('report')
  getReport(@Query('period') period?: string) {
    return this.adminService.getReport(period ?? new Date().toISOString().slice(0, 7));
  }
}
