/**
 * src/main.ts
 * Bootstrap NestJS app
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL?.split(',') ?? ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  });

  // Global validation
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Swagger (dev)
  if (process.env.NODE_ENV !== 'production') {
    const cfg = new DocumentBuilder()
      .setTitle('IoT-SPMS API')
      .setDescription('Smart Parking Management System – HCMUT SE252')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, cfg));
  }

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  logger.log(`
╔════════════════════════════════════════════════════════╗
║  🚗  IoT-SPMS Backend READY                            ║
║                                                         ║
║  📡  http://localhost:${port}                              ║
║  📚  http://localhost:${port}/api/docs (Swagger)           ║
║                                                         ║
║  Database  : MSSQL via Prisma                          ║
║  Auth      : JWT (mock HCMUT_SSO)                      ║
║  Queue     : DB-backed payment retry                   ║
║  IoT Sim   : Random changes every 4s                   ║
╚════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
