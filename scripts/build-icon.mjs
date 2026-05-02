#!/usr/bin/env node
/**
 * SolaHub brand icon builder.
 *
 * - Reads the source SVG from `~/Downloads/VistaPrint Logos (1)/colored-logo.svg`.
 * - Strips the wordmark (navy paths) and keeps only the sun glyph (gold paths).
 * - Renders the sun to a 1024x1024 PNG with auto-trim + 10% safe area.
 * - Writes:
 *     assets/brand/sun-icon-1024.png   ← input for `tauri icon`
 *     src/assets/brand/sun-icon.svg    ← in-app brand mark (sun-only)
 *     src/assets/brand/sun-icon-1024.png
 *
 * Run via:  node scripts/build-icon.mjs
 *           npm run tauri icon assets/brand/sun-icon-1024.png
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const SOURCE_SVG = join(homedir(), 'Downloads', 'VistaPrint Logos (1)', 'colored-logo.svg')
const ASSETS_BRAND_DIR = join(ROOT, 'assets', 'brand')
const SRC_BRAND_DIR = join(ROOT, 'src', 'assets', 'brand')

// Gold ≈ rgb(191,146,51) → keep. Navy ≈ rgb(11,46,81) → drop (the wordmark).
function isSunFill(rgbStr) {
  const m = /^rgb\((\d+),(\d+),(\d+)\)$/.exec(rgbStr)
  if (!m) return false
  const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])]
  return r > 150 && g > 100 && g < 180 && b < 90
}

async function main() {
  const raw = await readFile(SOURCE_SVG, 'utf8')

  const svgOpenMatch = raw.match(/<svg[^>]*>/)
  if (!svgOpenMatch) throw new Error('Could not locate <svg> tag in source.')

  // Pull paths individually and keep only the sun-fill ones.
  const pathRegex = /<path[\s\S]*?\/>/g
  const allPaths = raw.match(pathRegex) ?? []
  const sunPaths = allPaths.filter((p) => {
    const m = p.match(/fill="(rgb\([^)]+\))"/)
    return m ? isSunFill(m[1]) : false
  })

  if (sunPaths.length === 0) throw new Error('No sun-coloured paths found.')

  // Reconstruct an SVG that uses the original viewBox but contains only the sun.
  const sunOnlySvg = `${svgOpenMatch[0]}\n${sunPaths.join('\n')}\n</svg>`

  // Render at 4x for crisp downscale + auto-trim transparent margins.
  const renderSize = 4096
  const trimmed = await sharp(Buffer.from(sunOnlySvg))
    .resize({ width: renderSize, height: renderSize, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .trim()
    .toBuffer({ resolveWithObject: true })

  // Pad to a square with 10% safe area, then resize to 1024px.
  const trimmedDim = Math.max(trimmed.info.width, trimmed.info.height)
  const padded = Math.round(trimmedDim / 0.8) // 10% padding each side
  const squared = await sharp({
    create: {
      width: padded,
      height: padded,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: trimmed.data,
        top: Math.round((padded - trimmed.info.height) / 2),
        left: Math.round((padded - trimmed.info.width) / 2),
      },
    ])
    .png()
    .toBuffer()

  const final1024 = await sharp(squared)
    .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer()

  await mkdir(ASSETS_BRAND_DIR, { recursive: true })
  await mkdir(SRC_BRAND_DIR, { recursive: true })

  const pngPathTauri = join(ASSETS_BRAND_DIR, 'sun-icon-1024.png')
  const pngPathSrc = join(SRC_BRAND_DIR, 'sun-icon-1024.png')
  const svgPathSrc = join(SRC_BRAND_DIR, 'sun-icon.svg')

  await writeFile(pngPathTauri, final1024)
  await writeFile(pngPathSrc, final1024)
  await writeFile(svgPathSrc, sunOnlySvg)

  console.log('✓ wrote', pngPathTauri)
  console.log('✓ wrote', pngPathSrc)
  console.log('✓ wrote', svgPathSrc)
  console.log('\nNext: npx tauri icon', pngPathTauri)
}

main().catch((err) => {
  console.error('build-icon failed:', err)
  process.exit(1)
})
