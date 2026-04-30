import { Module, OnModuleInit } from '@nestjs/common';
import { IoTController } from './iot.controller';
import { IoTService } from './iot.service';

@Module({
  controllers: [IoTController],
  providers: [IoTService],
  exports: [IoTService],
})
export class IoTModule implements OnModuleInit {
  constructor(private readonly iotService: IoTService) {}

  onModuleInit() {
    // Simulator: random change mỗi 4 giây
    setInterval(() => {
      this.iotService.simulateRandomChanges().catch(() => {});
    }, 4000);
  }
}
