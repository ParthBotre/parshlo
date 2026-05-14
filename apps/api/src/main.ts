// IMPORTANT: telemetry must be imported & started BEFORE any other imports
// that we want to auto-instrument. Keep this block at the top of the file.
import { startOtel, startSentry } from '@parshlo/telemetry';

startOtel({ serviceName: 'parshlo-api' });
startSentry({});

import compress from '@fastify/compress';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  httpRequestDuration,
  httpRequestsTotal,
  registry,
} from '@parshlo/telemetry';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module.js';
import { type AppConfig } from './config/configuration.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      // Trust the first proxy for X-Forwarded-* (set behind ALB/Nginx/Cloudflare).
      trustProxy: 1,
      bodyLimit: 5 * 1024 * 1024, // 5 MB
      // Generate request id automatically if not present
      genReqId: (req) =>
        (req.headers['x-request-id'] as string | undefined) ??
        crypto.randomUUID(),
    }),
    {
      bufferLogs: true,
      rawBody: true,
    },
  );

  app.useLogger(app.get(Logger));

  const config = app.get(ConfigService<AppConfig>);

  // --- Security middleware ---
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [`'self'`],
        imgSrc: [`'self'`, 'data:', 'https:'],
        scriptSrc: [`'self'`],
      },
    },
    crossOriginEmbedderPolicy: false,
  });

  await app.register(cors, {
    origin: config.getOrThrow('cors.allowedOrigins', { infer: true }),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-Id',
      'Idempotency-Key',
    ],
    exposedHeaders: ['X-Request-Id'],
  });

  await app.register(cookie, {
    secret: config.getOrThrow('cookieSecret', { infer: true }),
  });

  await app.register(compress, { encodings: ['gzip', 'deflate'] });

  // --- /metrics endpoint (Prometheus) + per-request histogram ---
  const fastify = app.getHttpAdapter().getInstance() as unknown as {
    addHook: (event: string, fn: (req: unknown, reply: unknown, done?: () => void) => void) => void;
    get: (path: string, handler: (req: unknown, reply: unknown) => void | Promise<void>) => void;
  };
  fastify.addHook('onRequest', (req, _reply, done) => {
    (req as { _startNs?: bigint })._startNs = process.hrtime.bigint();
    done?.();
  });
  fastify.addHook('onResponse', (req, reply, done) => {
    const r = req as {
      _startNs?: bigint;
      method?: string;
      routeOptions?: { url?: string };
      url?: string;
    };
    const rep = reply as { statusCode: number };
    const start = r._startNs;
    if (start !== undefined) {
      const elapsed = Number(process.hrtime.bigint() - start) / 1e9;
      const route = r.routeOptions?.url ?? r.url ?? 'unknown';
      const method = r.method ?? 'UNKNOWN';
      const status = String(rep.statusCode);
      httpRequestDuration.labels(method, route, status).observe(elapsed);
      httpRequestsTotal.labels(method, route, status).inc();
    }
    done?.();
  });
  fastify.get('/metrics', async (_req, reply) => {
    const rep = reply as { type: (mime: string) => unknown; send: (body: string) => unknown };
    rep.type(registry.contentType);
    rep.send(await registry.metrics());
  });

  // --- Global pipes / filters ---
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter(app.get(Logger)));

  // --- API versioning: /v1/... ---
  app.setGlobalPrefix('v1', { exclude: ['health', 'health/(.*)'] });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // --- Swagger / OpenAPI ---
  if (config.get('swagger.enabled', { infer: true })) {
    const docConfig = new DocumentBuilder()
      .setTitle('Parshlo API')
      .setDescription('Enterprise pharmaceutical B2B ordering API')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'AccessToken',
      )
      .build();
    const doc = SwaggerModule.createDocument(app, docConfig);
    SwaggerModule.setup('docs', app, doc, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  app.enableShutdownHooks();

  const port = config.getOrThrow('port', { infer: true });
  await app.listen(port, '0.0.0.0');
  app.get(Logger).log(`🚀 Parshlo API listening on http://0.0.0.0:${String(port)}`);
}

bootstrap().catch((err: unknown) => {
   
  console.error('Fatal bootstrap error', err);
   
  process.exit(1);
});
