/**
 * providers/local.js
 *
 * Local provider — picks a random wallpaper from the local wallpapers directory.
 *
 * Folder layout expected:
 *   wallpapers/
 *     anime/          ← images for the "anime" category
 *     cyberpunk/      ← images for the "cyberpunk" category
 *     *.jpg           ← legacy flat files are picked from as well
 *
 * Behaviour:
 *  1. Scans every subdirectory under config.localDir and collects all images.
 *  2. For each configured category, if the image count is below
 *     config.scrapeThreshold, a background Pinterest scrape is triggered
 *     (fire-and-forget — never delays wallpaper selection).
 *  3. Picks one image at random from the full pool (all categories combined).
 *  4. Legacy flat files in wallpapers/ root are always included in the pool.
 */

import fs from 'fs/promises';
import path from 'path';
import config from '../config.js';
import * as logger from '../logger.js';
import { triggerScrapeIfNeeded } from '../scraper/autoScraper.js';

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Ensures the local wallpaper directory exists.
 */
async function ensureLocalDir() {
  await fs.mkdir(config.localDir, { recursive: true });
}

/**
 * Returns true if the given filename has a recognised image extension.
 * @param {string} filename
 * @returns {boolean}
 */
function isImage(filename) {
  return IMAGE_EXTENSIONS.has(path.extname(filename).toLowerCase());
}

// ── Image pool builder ────────────────────────────────────────────────────────

/**
 * Scans config.localDir and builds a flat array of absolute image paths.
 *
 * Includes:
 *  - All image files directly in wallpapers/       (legacy flat files)
 *  - All image files one level deep in wallpapers/*
 *
 * Also checks each *configured* category subfolder against the threshold
 * and fires background scrapes as needed.
 *
 * @returns {Promise<string[]>} Array of absolute image file paths.
 */
async function buildImagePool() {
  await ensureLocalDir();

  const allImages = [];

  // Read the root directory entries
  let rootEntries;
  try {
    rootEntries = await fs.readdir(config.localDir, { withFileTypes: true });
  } catch (err) {
    throw new Error(`Failed to read wallpapers directory: ${err.message}`);
  }

  // ── 1. Collect flat (legacy) images in the root ───────────────────────────

  const rootImages = rootEntries
    .filter(e => e.isFile() && isImage(e.name))
    .map(e => path.join(config.localDir, e.name));

  allImages.push(...rootImages);

  // ── 2. Collect images from each subdirectory ──────────────────────────────

  const subdirs = rootEntries.filter(e => e.isDirectory());

  // Build a map of subdirName → image count (for threshold checks)
  const categoryCountMap = {};

  for (const subdir of subdirs) {
    const subdirPath = path.join(config.localDir, subdir.name);
    let subFiles;

    try {
      subFiles = await fs.readdir(subdirPath);
    } catch (err) {
      logger.warn(`[LocalProvider] Could not read subfolder "${subdir.name}": ${err.message}`);
      continue;
    }

    const images = subFiles
      .filter(isImage)
      .map(f => path.join(subdirPath, f));

    allImages.push(...images);
    categoryCountMap[subdir.name.toLowerCase()] = images.length;
  }

  // ── 3. Trigger auto-scrapes for low categories ────────────────────────────

  for (const category of config.categories) {
    const count = categoryCountMap[category] ?? 0;
    triggerScrapeIfNeeded(category, count);
  }

  // Log a summary of the pool
  const breakdown = config.categories
    .map(c => `${c}:${categoryCountMap[c] ?? 0}`)
    .join(', ');
  logger.info(`[LocalProvider] Image pool: ${allImages.length} total (${breakdown}${rootImages.length > 0 ? `, misc:${rootImages.length}` : ''})`);

  return allImages;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Fetches a random local wallpaper from the full image pool (all categories).
 *
 * Returns an object with:
 *   - id        {string}  Relative path used as a unique identifier
 *   - url       {string}  'local' (not downloaded — kept for interface compatibility)
 *   - sourceId  {string}  Prefixed unique key: "local_<relative-path>"
 *   - localPath {string}  Absolute path to the image file
 *
 * @param {string} _category - Ignored; this provider always samples the full pool.
 * @returns {Promise<{ id: string, url: string, sourceId: string, localPath: string }>}
 */
export async function getRandomWallpaper(_category) {
  const pool = await buildImagePool();

  if (pool.length === 0) {
    throw new Error(
      `No wallpaper images found in ${config.localDir}. ` +
      `Run "npm run scrape:all" to download images first.`
    );
  }

  // Pick a random image from the entire pool
  const absolutePath = pool[Math.floor(Math.random() * pool.length)];

  // Build a stable relative key for history tracking
  const relPath = path.relative(config.localDir, absolutePath).replace(/\\/g, '/');

  return {
    id:        relPath,
    url:       'local',
    sourceId:  `local_${relPath}`,
    localPath: absolutePath,
  };
}
