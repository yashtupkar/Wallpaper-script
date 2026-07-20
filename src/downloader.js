/**
 * downloader.js
 *
 * Handles downloading wallpaper images from remote URLs to the local cache.
 * Ensures the cache directory exists and only ever stores a single current image.
 */

import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import axios from 'axios';
import config from './config.js';
import * as logger from './logger.js';

// ── Cache directory setup ─────────────────────────────────────────────────────

/**
 * Ensures the cache directory exists, creating it if necessary.
 * @returns {Promise<void>}
 */
export async function ensureCacheDir() {
  try {
    await fs.mkdir(config.cacheDir, { recursive: true });
  } catch (err) {
    // Ignore "already exists" errors; re-throw anything else
    if (err.code !== 'EEXIST') throw err;
  }
}

// ── Previous file cleanup ─────────────────────────────────────────────────────

/**
 * Deletes the previous wallpaper file if it exists.
 * Silently ignores missing files.
 * @returns {Promise<void>}
 */
async function deletePreviousWallpaper() {
  try {
    await fs.unlink(config.currentImage);
    logger.info('Previous wallpaper removed from cache.');
  } catch (err) {
    if (err.code !== 'ENOENT') {
      // File existed but could not be deleted – log but do not crash
      logger.warn(`Could not delete previous wallpaper: ${err.message}`);
    }
  }
}

// ── Download ──────────────────────────────────────────────────────────────────

/**
 * Downloads an image from `url` and saves it as `cache/current.jpg`.
 *
 * Workflow:
 *   1. Ensure cache directory exists.
 *   2. Stream the remote image to a temporary file.
 *   3. Delete the old `current.jpg`.
 *   4. Rename the temp file to `current.jpg` (atomic on same partition).
 *
 * @param {string} url - Remote image URL.
 * @returns {Promise<string>} Absolute path to the saved image.
 */
export async function downloadWallpaper(url) {
  await ensureCacheDir();

  const tempPath = path.join(config.cacheDir, `temp_${Date.now()}.jpg`);

  logger.info('Downloading wallpaper...');

  // Stream the response directly to disk (avoids loading entire image into RAM)
  const response = await axios.get(url, {
    responseType: 'stream',
    timeout: 60_000,          // 60 s download timeout
    maxContentLength: 50 * 1024 * 1024, // 50 MB max
  });

  await new Promise((resolve, reject) => {
    const writer = createWriteStream(tempPath);
    response.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
    response.data.on('error', reject);
  });

  logger.info('Download complete.');

  // Atomically replace old wallpaper
  await deletePreviousWallpaper();
  await fs.rename(tempPath, config.currentImage);

  return config.currentImage;
}
