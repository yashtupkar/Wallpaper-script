/**
 * scraper/scrapeAll.js
 *
 * One-shot bootstrap script — scrapes ALL configured categories upfront.
 *
 * Usage:
 *   npm run scrape:all
 *
 * This is useful on first setup to populate every category folder before
 * starting the wallpaper rotation daemon.
 *
 * Categories scraped: those listed in the CATEGORY env var (comma-separated).
 * To scrape every known category, set CATEGORY=all in your .env (or unset it).
 */

import config from '../config.js';
import * as logger from '../logger.js';
import { scrapeCategory } from './pinterest.js';
import { VALID_CATEGORIES } from '../config.js';

// Determine which categories to scrape
// If CATEGORY env contains 'all', scrape every known category.
const shouldScrapeAll = process.env.CATEGORY?.toLowerCase() === 'all';
const categoriesToScrape = shouldScrapeAll ? VALID_CATEGORIES : config.categories;

async function scrapeAll() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║     🖼  Pinterest Bulk Scraper — All         ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  logger.info(`Scraping ${categoriesToScrape.length} categories: ${categoriesToScrape.join(', ')}`);
  logger.info(`Target per category: ${config.scrapeCount} images`);
  console.log('');

  const results = [];

  for (const category of categoriesToScrape) {
    try {
      const downloaded = await scrapeCategory(category, config.scrapeCount);
      results.push({ category, downloaded, status: 'ok' });
    } catch (err) {
      logger.error(`Failed to scrape "${category}": ${err.message}`);
      results.push({ category, downloaded: 0, status: 'error', error: err.message });
    }
    // Short pause between categories to avoid hammering Pinterest
    await new Promise(r => setTimeout(r, 3000));
  }

  // ── Summary ──────────────────────────────────────────────────────────────

  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║                  Summary                    ║');
  console.log('╚══════════════════════════════════════════════╝');

  let totalDownloaded = 0;
  for (const { category, downloaded, status, error } of results) {
    const icon = status === 'ok' ? '✔' : '✘';
    const msg = status === 'ok'
      ? `${downloaded} images`
      : `FAILED — ${error}`;
    console.log(`  ${icon}  ${category.padEnd(15)} ${msg}`);
    totalDownloaded += downloaded;
  }

  console.log('');
  logger.success(`Done! Total new images downloaded: ${totalDownloaded}`);
}

scrapeAll().catch(err => {
  logger.error(`scrapeAll failed: ${err.message}`, err);
  process.exit(1);
});
