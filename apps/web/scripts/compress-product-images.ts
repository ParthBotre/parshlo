/* eslint-disable no-console, security/detect-non-literal-fs-filename --
   Dev-only script that operates exclusively on apps/web/public/product-images/.
   All paths are derived from readdir() on a hard-coded directory; there is no
   external input. The security rule's heuristic doesn't see that. */
/**
 * One-shot compression for `apps/web/public/product-images/`.
 *
 * - Resizes longest edge to 800px (keeps aspect ratio).
 * - Re-encodes to WebP at quality 80.
 * - Writes `<slug>.webp` next to the original.
 * - Deletes the original (.jpg/.jpeg/.png) after a successful encode.
 * - Leaves files alone if they are already .webp or below SIZE_FLOOR_BYTES.
 *
 * Run with:
 *   pnpm --filter @parshlo/web run compress:product-images
 */
import { readdir, rename, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(SCRIPT_DIR, '../public/product-images');
const MAX_EDGE = 800;
const WEBP_QUALITY = 80;
// Files smaller than this are assumed already compressed; we skip them.
const SIZE_FLOOR_BYTES = 200 * 1024;
const SOURCE_EXTS = new Set(['.jpg', '.jpeg', '.png']);

interface Result {
  file: string;
  before: number;
  after: number;
  status: 'compressed' | 'skipped' | 'error';
  detail?: string;
}

async function processFile(absPath: string): Promise<Result> {
  const file = path.basename(absPath);
  const ext = path.extname(file).toLowerCase();

  if (!SOURCE_EXTS.has(ext)) {
    return { file, before: 0, after: 0, status: 'skipped', detail: `unsupported ext ${ext}` };
  }

  const beforeStat = await stat(absPath);
  if (beforeStat.size < SIZE_FLOOR_BYTES && ext !== '.png') {
    return {
      file,
      before: beforeStat.size,
      after: beforeStat.size,
      status: 'skipped',
      detail: 'already small',
    };
  }

  const slug = path.basename(file, ext);
  const outFinal = path.join(SRC_DIR, `${slug}.webp`);
  const outTmp = path.join(SRC_DIR, `${slug}.webp.tmp`);

  try {
    await sharp(absPath)
      .rotate() // honour EXIF orientation
      .resize({
        width: MAX_EDGE,
        height: MAX_EDGE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY, effort: 5 })
      .toFile(outTmp);

    await rename(outTmp, outFinal);

    // Delete the original only after the .webp is safely in place.
    if (path.resolve(absPath) !== path.resolve(outFinal)) {
      await unlink(absPath);
    }

    const afterStat = await stat(outFinal);
    return { file, before: beforeStat.size, after: afterStat.size, status: 'compressed' };
  } catch (err) {
    return {
      file,
      before: beforeStat.size,
      after: 0,
      status: 'error',
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

function formatKB(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function main(): Promise<void> {
  console.log(`Compressing images in ${SRC_DIR}`);
  console.log(`  max edge: ${String(MAX_EDGE)}px · webp quality: ${String(WEBP_QUALITY)}\n`);

  const entries = await readdir(SRC_DIR);
  const candidates = entries
    .filter((f) => SOURCE_EXTS.has(path.extname(f).toLowerCase()))
    .map((f) => path.join(SRC_DIR, f));

  if (candidates.length === 0) {
    console.log('No .jpg/.jpeg/.png files to process.');
    return;
  }

  const results: Result[] = [];
  for (const file of candidates) {
    const r = await processFile(file);
    results.push(r);
    const before = formatKB(r.before).padStart(10);
    const after = r.after ? formatKB(r.after).padStart(10) : '         —';
    const ratio = r.before && r.after ? `(${Math.round((r.after / r.before) * 100)}%)` : '';
    console.log(`  ${r.status.padEnd(11)} ${r.file.padEnd(30)} ${before} → ${after} ${ratio}`);
    if (r.detail && r.status !== 'compressed') {
      console.log(`              ↳ ${r.detail}`);
    }
  }

  const ok = results.filter((r) => r.status === 'compressed');
  const totalBefore = ok.reduce((s, r) => s + r.before, 0);
  const totalAfter = ok.reduce((s, r) => s + r.after, 0);
  const errors = results.filter((r) => r.status === 'error').length;

  console.log('');
  console.log(`Compressed: ${String(ok.length)}`);
  console.log(`Errors:     ${String(errors)}`);
  if (ok.length > 0) {
    console.log(
      `Total:      ${formatKB(totalBefore)} → ${formatKB(totalAfter)} ` +
        `(${Math.round((totalAfter / totalBefore) * 100)}% of original)`,
    );
  }

  if (errors > 0) {
    process.exitCode = 1;
  }
}

void main();
