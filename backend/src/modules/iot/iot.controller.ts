/**
 * src/modules/iot/iot.controller.ts
 */
import { Body, Controller, Get, Post, Param, Query } from '@nestjs/common';
import { IsString, IsOptional, IsBoolean, IsIn } from 'class-validator';
import { IoTService } from './iot.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

export class SensorEventDto {
  @IsString() sensorId: string;
  @IsString() @IsIn(['available', 'occupied']) status: 'available' | 'occupied';
  @IsOptional() @IsBoolean() isFaulty?: boolean;
  @IsOptional() @IsString() timestamp?: string;
}

@Controller('api/iot')
export class IoTController {
  constructor(private readonly iotService: IoTService) {}

  /**
   * POST /api/iot/sensor – endpoint cho IoT gateway
   * Public vì gateway không có JWT (dùng API key trong production)
   */
  @Public()
  @Post('sensor')
  sensorEvent(@Body() dto: SensorEventDto) {
    return this.iotService.processSensorEvent(dto);
  }

  @Get('slots')
  getAllSlots(@Query('zone') zone?: string) {
    return this.iotService.getAllSlots(zone);
  }

  @Get('led/:zone')
  getLed(@Param('zone') zone: string) {
    return this.iotService.computeLedState(zone);
  }

  @Roles('OPERATOR', 'ADMIN')
  @Post('sensor/:id/fault')
  markFault(@Param('id') id: string) {
    return this.iotService.markSensorFault(id);
  }
}
