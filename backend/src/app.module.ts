/**
 * src/app.module.ts
 * Root module – import tất cả modules và register global guards
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';

import { PrismaModule } from './config/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ParkingModule } from './modules/parking/parking.module';
import { VisitorModule } from './modules/visitor/visitor.module';
import { IoTModule } from './modules/iot/iot.module';
import { BillingModule } from './modules/billing/billing.module';
import { AdminModule } from './modules/admin/admin.module';
import { QueueModule } from './queue/queue.module';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),    // cho payment queue
    PrismaModule,
    AuthModule,
    ParkingModule,
    VisitorModule,
    IoTModule,
    BillingModule,
    AdminModule,
    QueueModule,
  ],
  providers: [
    // Global JWT auth (all routes protected unless @Public)
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Global RBAC (chỉ check khi route có @Roles)
    { provide: APP_GUARD, useClass: RolesGuard },
    // Global error formatting
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
