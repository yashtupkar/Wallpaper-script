/**
 * index.js
 *
 * Application entry point.
 * Validates configuration, sets up the cache directory, and starts the scheduler.
 */

import config from './config.js';
import * as logger from './logger.js';
import { ensureCacheDir } from './downloader.js';
import { startScheduler } from './scheduler.js';

// ── Startup banner ────────────────────────────────────────────────────────────

function printBanner() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║       🖼  Windows Wallpaper Changer          ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  logger.info(`Provider   : ${config.source}`);
  logger.info(`Categories : ${config.categories.join(', ')}`);
  logger.info(`Interval   : ${config.intervalDisplay}`);
  logger.info(`History    : ${config.keepHistory ? `enabled (max ${config.historyMaxSize} entries)` : 'disabled'}`);
  if (config.source === 'local') {
    logger.info(`Auto-scrape: trigger < ${config.scrapeThreshold} images/category, fetch ${config.scrapeCount} per run`);
  }
  console.log('');
}

// ── API key validation ────────────────────────────────────────────────────────

/**
 * Warns if the configured provider's API key is missing.
 * Does not exit – lets the provider give a descriptive error on first fetch.
 */
function warnMissingKeys() {
  const keyMap = {
    unsplash:  { key: config.unsplashKey,  name: 'UNSPLASH_KEY' },
    pexels:    { key: config.pexelsKey,    name: 'PEXELS_KEY' },
    wallhaven: { key: config.wallhavenKey, name: 'WALLHAVEN_KEY (optional)' },
  };

  const { key, name } = keyMap[config.source] || {};

  if (key === '' && config.source !== 'wallhaven') {
    logger.warn(`API key not set: ${name}. Add it to your .env file.`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  printBanner();
  warnMissingKeys();

  // Ensure cache directory is ready before the scheduler fires
  await ensureCacheDir();

  // Start the cron scheduler (runs once immediately, then on interval)
  startScheduler();
}

main().catch((err) => {
  logger.error(`Fatal startup error: ${err.message}`, err);
  process.exit(1);
});
