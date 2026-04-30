/**
 * src/modules/iot/iot.controller.ts
 */
import { Body, Controller, Get, Post, Param, Query, Headers, UnauthorizedException } from '@nestjs/common';
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
   * Dùng API key (x-iot-key header) thay JWT — gateway không có user session
   */
  @Public()
  @Post('sensor')
  sensorEvent(
    @Body() dto: SensorEventDto,
    @Headers('x-iot-key') iotKey: string,
  ) {
    const expected = process.env.IOT_API_KEY ?? 'iot_spms_dev_key';
    if (iotKey !== expected) throw new UnauthorizedException('Invalid IoT API key');
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
