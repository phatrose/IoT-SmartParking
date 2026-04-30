import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { QueueModule } from '../../queue/queue.module';

@Module({
  imports:    [QueueModule],
  controllers:[BillingController],
  providers:  [BillingService],
})
export class BillingModule {}
