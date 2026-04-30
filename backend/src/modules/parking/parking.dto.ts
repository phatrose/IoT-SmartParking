/**
 * src/modules/parking/parking.dto.ts
 */
import { IsString, IsOptional, IsNumberString } from 'class-validator';

export class CheckInDto {
  @IsString()
  rfid_card: string;

  @IsString()
  gate_id: string;

  @IsOptional()
  @IsNumberString()
  slot_id?: string;
}

export class CheckOutDto {
  @IsString()
  rfid_card: string;

  @IsString()
  gate_id: string;
}
