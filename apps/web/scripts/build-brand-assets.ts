/* eslint-disable no-console, security/detect-non-literal-fs-filename --
   Dev-only script that operates exclusively on apps/web/public/brand/ and
   apps/web/src/app/. All paths are hard-coded; no external input. */
/**
 * Derives every brand asset the app needs from a single master PNG.
 *
 * Source:
 *   apps/web/public/brand/parshlo.png   (combined logomark + wordmark)
 *
 * Outputs:
 *   apps/web/public/brand/parshlo-mark.webp     — logomark only (square, transparent)
 *   apps/web/public/brand/parshlo-mark@2x.webp  — 2× retina version
 *   apps/web/public/brand/parshlo-lockup.webp   — full lockup, compressed
 *   apps/web/src/app/icon.png                   — 64×64 favicon
 *   apps/web/src/app/apple-icon.png             — 180×180 iOS touch icon
 *   apps/web/src/app/opengraph-image.png        — 1200×630 social preview
 *
 * Run with:
 *   pnpm --filter @parshlo/web run build:brand
 */
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(SCRIPT_DIR, '..');
const SRC_MASTER = path.join(WEB_ROOT, 'public/brand/parshlo.png');
const BRAND_DIR = path.join(WEB_ROOT, 'public/brand');
const APP_DIR = path.join(WEB_ROOT, 'src/app');

/** Output size (longest edge in px) for the standard mark in the header. */
const MARK_EDGE = 256;
const MARK_EDGE_2X = 512;
/** Lockup is bounded by its longest edge to keep file size predictable. */
const LOCKUP_MAX_EDGE = 600;
/** Favicons. */
const ICON_SIZE = 64;
const APPLE_ICON_SIZE = 180;
/** Open Graph card. */
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
/** White background for iOS + OG (Apple disallows transparent app icons). */
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 } as const;

async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

function fmtKB(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/**
 * Finds the icon/wordmark boundary automatically by scanning the master for
 * the largest transparent gap between content rows. Returns the y-coordinate
 * where the icon ends (which is also the start of the transparent gap).
 *
 * Counts a row as "empty" when fewer than 1% of its pixels are non-transparent
 * — this tolerates anti-aliased edges and stray dust.
 */
async function detectIconBottom(): Promise<{ width: number; iconBottom: number }> {
  const { data, info } = await sharp(SRC_MASTER)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const emptyThreshold = Math.max(1, Math.floor(width * 0.01));

  const opaquePerRow = new Array<number>(height);
  for (let y = 0; y < height; y++) {
    let count = 0;
    const rowOffset = y * width * channels;
    for (let x = 0; x < width; x++) {
      const alpha = data[rowOffset + x * channels + 3] ?? 0;
      if (alpha > 32) count++;
    }
    opaquePerRow[y] = count;
  }

  // Skip outer padding so the "largest gap" search only considers interior gaps.
  let firstContent = 0;
  while (firstContent < height && (opaquePerRow[firstContent] ?? 0) <= emptyThreshold) {
    firstContent++;
  }
  let lastContent = height - 1;
  while (lastContent >= 0 && (opaquePerRow[lastContent] ?? 0) <= emptyThreshold) {
    lastContent--;
  }

  // Find the longest run of empty rows strictly between firstContent and lastContent.
  let bestStart = -1;
  let bestLen = 0;
  let curStart = -1;
  for (let y = firstContent; y <= lastContent; y++) {
    const isEmpty = (opaquePerRow[y] ?? 0) <= emptyThreshold;
    if (isEmpty) {
      if (curStart === -1) curStart = y;
    } else if (curStart !== -1) {
      const len = y - curStart;
      if (len > bestLen) {
        bestStart = curStart;
        bestLen = len;
      }
      curStart = -1;
    }
  }

  // Require the gap to be at least 1.5% of image height to count as a real
  // separator. Falls back to 78% of canvas if nothing matches.
  const minGapPx = Math.max(3, Math.floor(height * 0.015));
  const iconBottom = bestStart > 0 && bestLen >= minGapPx ? bestStart : Math.floor(height * 0.78);

  return { width, iconBottom };
}

/**
 * Returns a buffer cropped to just the logomark, using detectIconBottom() to
 * pick the exact row where the icon ends. Trims any leftover transparent
 * margins so the resulting buffer is tight to the icon's bounding box.
 */
async function logomarkBuffer(): Promise<Buffer> {
  const { width, iconBottom } = await detectIconBottom();
  if (width === 0 || iconBottom === 0) {
    throw new Error(`Could not detect icon bounds in ${SRC_MASTER}`);
  }
  return sharp(SRC_MASTER)
    .extract({ left: 0, top: 0, width, height: iconBottom })
    .trim()
    .png()
    .toBuffer();
}

async function writeMark(): Promise<{ path: string; size: number }> {
  const mark = await logomarkBuffer();
  const outPath = path.join(BRAND_DIR, 'parshlo-mark.webp');
  await sharp(mark)
    .resize({
      width: MARK_EDGE,
      height: MARK_EDGE,
      fit: 'inside',
      withoutEnlargement: false,
    })
    .webp({ quality: 90, effort: 6, alphaQuality: 100 })
    .toFile(outPath);
  const s = await stat(outPath);
  return { path: outPath, size: s.size };
}

async function writeMark2x(): Promise<{ path: string; size: number }> {
  const mark = await logomarkBuffer();
  const outPath = path.join(BRAND_DIR, 'parshlo-mark@2x.webp');
  await sharp(mark)
    .resize({
      width: MARK_EDGE_2X,
      height: MARK_EDGE_2X,
      fit: 'inside',
      withoutEnlargement: false,
    })
    .webp({ quality: 90, effort: 6, alphaQuality: 100 })
    .toFile(outPath);
  const s = await stat(outPath);
  return { path: outPath, size: s.size };
}

async function writeLockup(): Promise<{ path: string; size: number }> {
  const outPath = path.join(BRAND_DIR, 'parshlo-lockup.webp');
  await sharp(SRC_MASTER)
    .trim()
    .resize({
      width: LOCKUP_MAX_EDGE,
      height: LOCKUP_MAX_EDGE,
      fit: 'inside',
      withoutEnlargement: false,
    })
    .webp({ quality: 90, effort: 6, alphaQuality: 100 })
    .toFile(outPath);
  const s = await stat(outPath);
  return { path: outPath, size: s.size };
}

async function writeFavicon(): Promise<{ path: string; size: number }> {
  const mark = await logomarkBuffer();
  const outPath = path.join(APP_DIR, 'icon.png');
  // Keep transparent — browsers handle it on both light and dark tabs.
  await sharp(mark)
    .resize({
      width: ICON_SIZE,
      height: ICON_SIZE,
      fit: 'contain',
      background: { ...WHITE, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  const s = await stat(outPath);
  return { path: outPath, size: s.size };
}

async function writeAppleIcon(): Promise<{ path: string; size: number }> {
  const mark = await logomarkBuffer();
  const outPath = path.join(APP_DIR, 'apple-icon.png');
  // Keep transparent so the icon blends with the parent (tab strip, dock
  // background, etc.). iOS may overlay it on a system background on the home
  // screen — that is the OS's job, not ours.
  await sharp(mark)
    .resize({
      width: APPLE_ICON_SIZE,
      height: APPLE_ICON_SIZE,
      fit: 'contain',
      background: { ...WHITE, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  const s = await stat(outPath);
  return { path: outPath, size: s.size };
}

async function writeOpenGraph(): Promise<{ path: string; size: number }> {
  const outPath = path.join(APP_DIR, 'opengraph-image.png');
  // Lockup at a comfortable size, centered on white.
  const lockup = await sharp(SRC_MASTER)
    .trim()
    .resize({ width: Math.round(OG_WIDTH * 0.35), fit: 'inside' })
    .toBuffer();
  await sharp({
    create: {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      channels: 4,
      background: WHITE,
    },
  })
    .composite([{ input: lockup, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  const s = await stat(outPath);
  return { path: outPath, size: s.size };
}

async function main(): Promise<void> {
  console.log(`Building brand assets from ${SRC_MASTER}\n`);
  await ensureDir(BRAND_DIR);
  await ensureDir(APP_DIR);

  const masterStat = await stat(SRC_MASTER);
  const { width: srcWidth, iconBottom } = await detectIconBottom();
  console.log(`  master: ${fmtKB(masterStat.size)}`);
  console.log(`  detected icon bottom at row ${iconBottom} (canvas width ${srcWidth})\n`);

  const results = [
    await writeMark(),
    await writeMark2x(),
    await writeLockup(),
    await writeFavicon(),
    await writeAppleIcon(),
    await writeOpenGraph(),
  ];

  for (const r of results) {
    const rel = path.relative(WEB_ROOT, r.path);
    console.log(`  wrote  ${rel.padEnd(40)} ${fmtKB(r.size).padStart(10)}`);
  }
  console.log('\nDone.');
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
