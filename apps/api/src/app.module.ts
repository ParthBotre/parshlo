import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { AdminModule } from './modules/admin/admin.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { InquiryModule } from './modules/inquiry/inquiry.module.js';
import { KycModule } from './modules/kyc/kyc.module.js';
import { OrderModule } from './modules/order/order.module.js';
import { ProductModule } from './modules/product/product.module.js';
import { UserModule } from './modules/user/user.module.js';
import { AuditInterceptor } from './common/interceptors/audit.interceptor.js';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from './modules/auth/guards/roles.guard.js';
import { PrismaModule } from './modules/prisma/prisma.module.js';
import { QueueModule } from './modules/queue/queue.module.js';
import { StorageModule } from './modules/storage/storage.module.js';
import { configuration } from './config/configuration.js';
import { configValidationSchema } from './config/validation.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: (raw) => configValidationSchema.parse(raw),
      cache: true,
    }),
    LoggerModule.forRootAsync({
      useFactory: () => ({
        pinoHttp: {
          name: 'parshlo-api',
          level: process.env.LOG_LEVEL ?? 'info',
          customProps: () => ({ context: 'HTTP' }),
          autoLogging: {
            ignore: (req) => req.url === '/health' || req.url === '/health/ready',
          },
          transport:
            process.env.NODE_ENV !== 'production'
              ? {
                  target: 'pino-pretty',
                  options: {
                    singleLine: true,
                    colorize: true,
                    translateTime: 'SYS:HH:MM:ss.l',
                  },
                }
              : undefined,
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'res.headers["set-cookie"]',
              '*.password',
              '*.token',
            ],
            censor: '[REDACTED]',
          },
        },
      }),
    }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'medium', ttl: 10_000, limit: 50 },
      { name: 'long', ttl: 60_000, limit: 200 },
    ]),
    PrismaModule,
    QueueModule,
    StorageModule,
    HealthModule,
    AuthModule,
    UserModule,
    KycModule,
    ProductModule,
    OrderModule,
    AdminModule,
    InquiryModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
