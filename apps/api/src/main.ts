/* eslint-disable import/order, import/no-duplicates --
   OpenTelemetry auto-instrumentation requires startOtel() to execute BEFORE
   any other instrumented module is imported. We therefore split the
   @parshlo/telemetry import into a side-effect block at the very top and a
   regular import below, which intentionally trips both rules. */
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
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { httpRequestDuration, httpRequestsTotal, registry } from '@parshlo/telemetry';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { type AppConfig } from './config/configuration.js';
/* eslint-enable import/order, import/no-duplicates */

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      // Trust the first proxy for X-Forwarded-* (set behind ALB/Nginx/Cloudflare).
      trustProxy: 1,
      bodyLimit: 5 * 1024 * 1024, // 5 MB
      // Generate request id automatically if not present
      genReqId: (req: { headers: Record<string, string | string[] | undefined> }) =>
        (req.headers['x-request-id'] as string | undefined) ?? crypto.randomUUID(),
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
    origin: config.getOrThrow<AppConfig['cors']>('cors').allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Idempotency-Key'],
    exposedHeaders: ['X-Request-Id'],
  });

  await app.register(cookie, {
    secret: config.getOrThrow<string>('cookieSecret'),
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
  const metricsHits = new Map<string, { count: number; resetAt: number }>();
  const METRICS_LIMIT = 30;
  const METRICS_WINDOW_MS = 60_000;

  fastify.get('/metrics', async (req, reply) => {
    const r = req as { ip?: string };
    const ip = r.ip ?? 'unknown';
    const now = Date.now();
    const bucket = metricsHits.get(ip);
    if (!bucket || bucket.resetAt <= now) {
      metricsHits.set(ip, { count: 1, resetAt: now + METRICS_WINDOW_MS });
    } else {
      bucket.count += 1;
      if (bucket.count > METRICS_LIMIT) {
        const rep = reply as { status: (code: number) => { send: (body: unknown) => void } };
        rep.status(429).send({
          type: 'about:blank',
          title: 'Too Many Requests',
          status: 429,
          code: 'RATE_LIMITED',
          detail: 'Metrics endpoint rate limit exceeded.',
        });
        return;
      }
    }

    const rep = reply as { type: (mime: string) => void; send: (body: string) => void };
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
  // NOTE: URI versioning already prepends `v<defaultVersion>`, so we must NOT
  // also setGlobalPrefix('v1') or routes end up at /v1/v1/... .
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // --- Swagger / OpenAPI ---
  if (config.get('swagger.enabled', { infer: true })) {
    const docConfig = new DocumentBuilder()
      .setTitle('Parshlo API')
      .setDescription('Enterprise pharmaceutical B2B ordering API')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'AccessToken')
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
  // Bootstrap failures are unrecoverable — exit non-zero so the orchestrator
  // (k8s / ECS / pm2) restarts the process instead of leaving it half-initialized.
  // eslint-disable-next-line no-process-exit
  process.exit(1);
});
