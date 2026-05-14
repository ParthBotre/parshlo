import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

export interface OtelInitOptions {
  serviceName: string;
  serviceVersion?: string;
  endpoint?: string;
  /** If true and no endpoint is provided, OTel is disabled (no-op). */
  enabled?: boolean;
}

let sdk: NodeSDK | null = null;

/**
 * Initialize OpenTelemetry tracing. Call this VERY early — before any other
 * imports that you want to be auto-instrumented (express, http, fastify, pg,
 * ioredis, etc.).
 *
 * If OTEL_EXPORTER_OTLP_ENDPOINT is unset and no endpoint is passed, this is
 * a no-op so local dev doesn't try to ship spans to a non-existent collector.
 */
export function startOtel(opts: OtelInitOptions): void {
  const endpoint = opts.endpoint ?? process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const enabled = opts.enabled ?? Boolean(endpoint);
  if (!enabled) {
    return;
  }

  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: opts.serviceName,
      [ATTR_SERVICE_VERSION]: opts.serviceVersion ?? process.env.SERVICE_VERSION ?? '0.0.0',
    }),
    traceExporter: new OTLPTraceExporter({ url: endpoint }),
    instrumentations: [getNodeAutoInstrumentations()],
  });
  sdk.start();

  const shutdown = async (): Promise<void> => {
    if (sdk) {
      await sdk.shutdown().catch(() => undefined);
    }
  };
  process.once('SIGTERM', () => void shutdown());
  process.once('SIGINT', () => void shutdown());
}
