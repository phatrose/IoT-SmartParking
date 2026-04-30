/**
 * src/config/prisma.service.ts
 * Wrap PrismaClient để inject qua DI
 */
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Prisma');

  async onModuleInit() {
    await this.$connect();
    this.logger.log('✅ Connected to MSSQL via Prisma');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
