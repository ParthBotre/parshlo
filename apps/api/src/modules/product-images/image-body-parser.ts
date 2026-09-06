import { PRODUCT_IMAGE_CONTENT_TYPES, PRODUCT_IMAGE_MAX_UPLOAD_BYTES } from '@parshlo/types';
import { type FastifyInstance } from 'fastify';

export function registerImageBodyParser(server: FastifyInstance): void {
  server.addContentTypeParser(
    [...PRODUCT_IMAGE_CONTENT_TYPES],
    { parseAs: 'buffer', bodyLimit: PRODUCT_IMAGE_MAX_UPLOAD_BYTES },
    (_request, body, done) => done(null, body),
  );
}
