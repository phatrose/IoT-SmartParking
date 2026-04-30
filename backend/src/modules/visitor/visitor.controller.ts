/**
 * src/modules/visitor/visitor.controller.ts
 */
import { Body, Controller, Get, Post, Query, Module } from '@nestjs/common';
import { IsString, IsNumber, IsOptional, IsIn, Min, Max } from 'class-validator';
import { VisitorService } from './visitor.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

export class IssueTicketDto {
  @IsString() license_plate: string;
  @IsString() @IsIn(['motorbike', 'car', 'bicycle']) vehicle_type: string;
  @IsOptional() @IsString() visitor_name?: string;
  @IsNumber() @Min(1) @Max(24) duration_hours: number;
}

export class CheckoutVisitorDto {
  @IsString() ticket_code: string;
}

@Controller('api/visitor')
export class VisitorController {
  constructor(private readonly visitorService: VisitorService) {}

  @Roles('OPERATOR', 'ADMIN')
  @Post('ticket')
  issue(@Body() dto: IssueTicketDto, @CurrentUser() user) {
    return this.visitorService.issueTicket({
      licensePlate:  dto.license_plate,
      vehicleType:   dto.vehicle_type,
      visitorName:   dto.visitor_name,
      durationHours: dto.duration_hours,
      operatorId:    user.id,
    });
  }

  @Roles('OPERATOR', 'ADMIN')
  @Post('checkout')
  checkout(@Body() dto: CheckoutVisitorDto) {
    return this.visitorService.checkout(dto.ticket_code);
  }

  @Get('tickets')
  list(@Query('active') active?: string) {
    return this.visitorService.listTickets(active !== 'false');
  }
}
