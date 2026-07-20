/**
 * index.js
 *
 * Entry point — picks one random wallpaper from the local library,
 * sets it as the desktop background, then exits.
 *
 * Scheduling is handled externally (Windows Task Scheduler, cron, etc.)
 */

import fs from 'fs/promises';
import wallpaperPkg from 'wallpaper';
const { set: setWallpaper } = wallpaperPkg;

import config from './config.js';
import * as logger from './logger.js';
import { ensureCacheDir } from './downloader.js';
import { loadHistory, addToHistory } from './historyManager.js';
import { getRandomWallpaper } from './providers/local.js';

// ── Startup banner ─────────────────────────────────────────────────────────────

function printBanner() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║       🖼  Windows Wallpaper Changer          ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  logger.info(`Categories : ${config.categories.join(', ')}`);
  logger.info(`Auto-scrape: trigger < ${config.scrapeThreshold} images/category, fetch ${config.scrapeCount} per run`);
  console.log('');
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  printBanner();
  await ensureCacheDir();

  // Load seen history for duplicate prevention
  const history = config.keepHistory ? await loadHistory() : [];

  // Try to find a wallpaper not yet seen (up to 20 attempts)
  const MAX_ATTEMPTS = 20;
  let wallpaper = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const candidate = await getRandomWallpaper();

    if (!history.includes(candidate.sourceId)) {
      wallpaper = candidate;
      if (attempt > 1) logger.info(`Found a new wallpaper after ${attempt} attempts.`);
      break;
    }

    logger.info(`Already seen (${candidate.sourceId}). Trying another... (${attempt}/${MAX_ATTEMPTS})`);
  }

  if (!wallpaper) {
    logger.warn('All wallpapers have been seen. Resetting and picking any random one.');
    wallpaper = await getRandomWallpaper();
  }

  // Set the wallpaper
  try {
    await setWallpaper(wallpaper.localPath);
    logger.success(`✔ Wallpaper set: ${wallpaper.localPath}`);
  } catch (err) {
    logger.error(`Failed to set wallpaper: ${err.message}`);
    process.exit(1);
  }

  // Auto-delete the used wallpaper from disk if configured
  if (config.autoDeleteUsed) {
    try {
      await fs.unlink(wallpaper.localPath);
      logger.info(`🗑  Deleted used wallpaper: ${wallpaper.localPath}`);
    } catch (err) {
      logger.warn(`Could not delete used wallpaper: ${err.message}`);
    }
  }

  // Record in history
  if (config.keepHistory) {
    await addToHistory(wallpaper.sourceId);
  }

  // Done — exit cleanly so the OS scheduler can call us again next time
  process.exit(0);
}

main().catch(err => {
  logger.error(`Fatal error: ${err.message}`, err);
  process.exit(1);
});
