/**
 * wallpaperManager.js
 *
 * Orchestrates the full wallpaper update cycle:
 *   1. Select a provider based on config.
 *   2. Fetch a new wallpaper (with duplicate detection and retries).
 *   3. Download the image to cache.
 *   4. Set it as the Windows desktop wallpaper.
 *   5. Update the history file.
 */

import wallpaperPkg from 'wallpaper';
const { set: setWallpaper } = wallpaperPkg;
import config from './config.js';
import * as logger from './logger.js';
import { downloadWallpaper, ensureCacheDir } from './downloader.js';
import { loadHistory, addToHistory } from './historyManager.js';

// ── Provider registry ─────────────────────────────────────────────────────────

/**
 * Lazily imports the active provider module.
 * Adding a new provider: drop a file in src/providers/ and add it to this map.
 * @returns {Promise<{ getRandomWallpaper: Function }>}
 */
async function loadProvider() {
  const providers = {
    unsplash:  () => import('./providers/unsplash.js'),
    pexels:    () => import('./providers/pexels.js'),
    wallhaven: () => import('./providers/wallhaven.js'),
    local:     () => import('./providers/local.js'),
  };

  const loader = providers[config.source];

  if (!loader) {
    throw new Error(`Unknown provider: "${config.source}". Add it to src/providers/.`);
  }

  return loader();
}

// ── Duplicate-aware wallpaper fetch ──────────────────────────────────────────

const MAX_UNIQUE_ATTEMPTS = 20;

/**
 * Fetches a wallpaper that has not been seen before.
 * Retries up to MAX_UNIQUE_ATTEMPTS times.
 *
 * @param {{ getRandomWallpaper: Function }} provider
 * @param {string[]} history - Array of already-seen sourceIds.
 * @param {string} category - The category to fetch for this run.
 * @returns {Promise<{ id: string, url: string, sourceId: string } | null>}
 *   Resolves to the wallpaper info, or null if no unique wallpaper was found.
 */
async function fetchUniqueWallpaper(provider, history, category) {
  for (let attempt = 1; attempt <= MAX_UNIQUE_ATTEMPTS; attempt++) {
    const wallpaper = await provider.getRandomWallpaper(category);

    if (!history.includes(wallpaper.sourceId)) {
      if (attempt > 1) {
        logger.info(`Found a new wallpaper after ${attempt} attempts.`);
      }
      return wallpaper;
    }

    logger.info(`Wallpaper already used (${wallpaper.sourceId}). Searching for another... (attempt ${attempt}/${MAX_UNIQUE_ATTEMPTS})`);
  }

  return null; // Exhausted all attempts
}

// ── Provider-level retry ──────────────────────────────────────────────────────

const MAX_PROVIDER_RETRIES = 3;

/**
 * Calls fetchUniqueWallpaper with up to MAX_PROVIDER_RETRIES on network/API errors.
 *
 * @param {{ getRandomWallpaper: Function }} provider
 * @param {string[]} history
 * @param {string} category
 * @returns {Promise<{ id: string, url: string, sourceId: string } | null>}
 */
async function fetchWithRetry(provider, history, category) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_PROVIDER_RETRIES; attempt++) {
    try {
      return await fetchUniqueWallpaper(provider, history, category);
    } catch (err) {
      lastError = err;
      logger.warn(`Provider fetch failed (attempt ${attempt}/${MAX_PROVIDER_RETRIES}): ${err.message}`);

      if (attempt < MAX_PROVIDER_RETRIES) {
        // Exponential back-off: 2s, 4s, 8s …
        const delay = 2000 * Math.pow(2, attempt - 1);
        logger.info(`Retrying in ${delay / 1000}s…`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError;
}

// ── Main update cycle ─────────────────────────────────────────────────────────

/**
 * Runs one complete wallpaper update cycle.
 * Will not throw – all errors are caught so the scheduler is never disrupted.
 *
 * @returns {Promise<void>}
 */
export async function updateWallpaper() {
  // Pick a random category from the configured list on each run
  const category = config.categories[
    Math.floor(Math.random() * config.categories.length)
  ];

  logger.info(`Fetching wallpaper from "${config.source}" [category: ${category}]...`);

  await ensureCacheDir();

  let provider;
  try {
    provider = await loadProvider();
  } catch (err) {
    logger.error(`Failed to load provider "${config.source}": ${err.message}`, err);
    return;
  }

  // Load history for duplicate detection
  const history = config.keepHistory ? await loadHistory() : [];

  let wallpaper;
  try {
    wallpaper = await fetchWithRetry(provider, history, category);
  } catch (err) {
    logger.error(`Failed to fetch wallpaper after ${MAX_PROVIDER_RETRIES} retries. Keeping current wallpaper.`, err);
    return;
  }

  // No unique wallpaper found after all attempts
  if (!wallpaper) {
    logger.warn(`No unique wallpaper found after ${MAX_UNIQUE_ATTEMPTS} attempts. Keeping the current wallpaper.`);
    return;
  }

  // If the provider returned a localPath (e.g. the 'local' provider), use it directly.
  // Otherwise, download the image from the URL.
  let imagePath;
  if (wallpaper.localPath) {
    imagePath = wallpaper.localPath;
    logger.info(`Using local image: ${imagePath}`);
  } else {
    try {
      imagePath = await downloadWallpaper(wallpaper.url);
    } catch (err) {
      logger.error(`Failed to download wallpaper: ${err.message}`, err);
      return;
    }
  }

  // Set the Windows wallpaper
  try {
    await setWallpaper(imagePath);
    logger.success(`Wallpaper changed successfully. [${wallpaper.sourceId}]`);
  } catch (err) {
    logger.error(`Failed to set wallpaper: ${err.message}`, err);
    return;
  }

  // Persist to history
  if (config.keepHistory) {
    await addToHistory(wallpaper.sourceId);
  }
}
