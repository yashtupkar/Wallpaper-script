/**
 * scraper/autoScraper.js
 *
 * Background auto-scrape orchestrator.
 *
 * Tracks in-progress scrapes per category so we never launch duplicate
 * scrapes for the same category simultaneously.
 *
 * Usage:
 *   import { triggerScrapeIfNeeded } from './scraper/autoScraper.js';
 *   await triggerScrapeIfNeeded('anime', 15); // 15 = current image count
 */

import config from '../config.js';
import * as logger from '../logger.js';
import { scrapeCategory } from './pinterest.js';

// ── In-progress tracker ───────────────────────────────────────────────────────

/**
 * Set of category names that are currently being scraped.
 * Prevents duplicate concurrent scrapes for the same category.
 * @type {Set<string>}
 */
const inProgress = new Set();

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Fires a background scrape for `category` if:
 *  - `currentCount` is below `config.scrapeThreshold`, AND
 *  - no scrape for this category is already running.
 *
 * The scrape runs asynchronously — this function returns immediately
 * so it never delays wallpaper selection.
 *
 * @param {string} category     - Category name (e.g. "anime").
 * @param {number} currentCount - Number of images currently on disk for this category.
 * @returns {void}
 */
export function triggerScrapeIfNeeded(category, currentCount) {
  if (currentCount >= config.scrapeThreshold) return;
  if (inProgress.has(category)) {
    logger.info(`[AutoScraper] Scrape already running for "${category}" (${currentCount} images). Skipping duplicate.`);
    return;
  }

  logger.warn(
    `[AutoScraper] Category "${category}" is low (${currentCount} < ${config.scrapeThreshold}). ` +
    `Starting background scrape for ${config.scrapeCount} images...`
  );

  inProgress.add(category);

  // Fire-and-forget — intentionally not awaited
  scrapeCategory(category, config.scrapeCount)
    .then(downloaded => {
      logger.success(`[AutoScraper] Background scrape for "${category}" finished — ${downloaded} new images.`);
    })
    .catch(err => {
      logger.error(`[AutoScraper] Background scrape for "${category}" failed: ${err.message}`, err);
    })
    .finally(() => {
      inProgress.delete(category);
    });
}

/**
 * Returns a list of categories that currently have an active scrape running.
 * @returns {string[]}
 */
export function getInProgressCategories() {
  return [...inProgress];
}
