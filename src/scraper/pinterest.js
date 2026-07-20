/**
 * scraper/pinterest.js
 *
 * Pinterest image scraper — usable both as a module and as a CLI script.
 *
 * As a module:
 *   import { scrapeCategory } from './scraper/pinterest.js';
 *   await scrapeCategory('anime', 40, '/path/to/wallpapers/anime');
 *
 * As a CLI script:
 *   node src/scraper/pinterest.js anime
 *   node src/scraper/pinterest.js cyberpunk
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { createWriteStream, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import axios from 'axios';
import config from '../config.js';
import * as logger from '../logger.js';

const __filename = fileURLToPath(import.meta.url);

// ── Category → Pinterest search query map ─────────────────────────────────────

/**
 * Maps config category names to Pinterest-optimised search queries.
 * Pinterest's search is keyword-based, so richer phrases yield better results.
 */
export const CATEGORY_QUERIES = {
  cyberpunk:    'cyberpunk neon city 4k wallpaper',
  programming:  'programming setup desk aesthetic wallpaper',
  dark:         'dark aesthetic wallpaper desktop',
  abstract:     'abstract art wallpaper 4k',
  architecture: 'architecture city wallpaper 4k',
  anime:        'anime aesthetic wallpaper 4k desktop',
  aesthetic:    'aesthetic wallpaper desktop pc 4k',
  lofi:         'lofi aesthetic wallpaper desktop',
  gaming:       'gaming wallpaper 4k desktop',
  cars:         'car wallpaper 4k aesthetic',
  city:         'city night wallpaper 4k desktop',
  nature:       'nature landscape wallpaper 4k',
  space:        'space galaxy wallpaper 4k',
  minimal:      'minimalist wallpaper desktop 4k',
  mountains:    'mountain landscape wallpaper 4k',
};

// ── Image download helper ─────────────────────────────────────────────────────

/**
 * Downloads a single image URL to a local file path.
 * @param {string} url
 * @param {string} dest - Absolute file path to write to.
 * @returns {Promise<void>}
 */
async function downloadImage(url, dest) {
  const response = await axios.get(url, {
    responseType: 'stream',
    timeout: 30_000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    },
  });

  return new Promise((resolve, reject) => {
    const writer = createWriteStream(dest);
    response.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
    response.data.on('error', reject);
  });
}

// ── Core scraper ──────────────────────────────────────────────────────────────

/**
 * Scrapes Pinterest for images matching `category` and downloads them to `targetDir`.
 *
 * @param {string} category       - Config category name (e.g. "anime").
 * @param {number} [count]        - Target number of images to download (default: config.scrapeCount).
 * @param {string} [targetDir]    - Directory to save images in. Defaults to `wallpapers/<category>/`.
 * @returns {Promise<number>}       Number of images actually downloaded.
 */
export async function scrapeCategory(
  category,
  count = config.scrapeCount,
  targetDir = path.join(config.localDir, category)
) {
  const query = CATEGORY_QUERIES[category] || `${category} wallpaper 4k desktop`;

  logger.info(`[Scraper] Starting Pinterest scrape: category="${category}", target=${count}, query="${query}"`);

  // Ensure output directory exists
  await fs.mkdir(targetDir, { recursive: true });

  // ── Browser / scraping phase ──────────────────────────────────────────────

  // Declare outside try/finally so it's accessible in the download phase below
  const scrapedUrls = new Set();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  });

  try {
    const page = await context.newPage();
    const searchUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`;
    logger.info(`[Scraper] Navigating to Pinterest: ${searchUrl}`);

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(5000);

    // Wait for images to appear
    try {
      await page.waitForSelector('img', { timeout: 12_000 });
    } catch {
      logger.warn(`[Scraper] No images found for "${category}" — Pinterest may be throttling.`);
      return 0;
    }

    logger.info(`[Scraper] Collecting image URLs for "${category}"...`);

    let scrollAttempts = 0;
    const MAX_SCROLLS = 20;

    while (scrapedUrls.size < count && scrollAttempts < MAX_SCROLLS) {
      const urls = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('img'))
          // Require landscape aspect ratio
          .filter(img => img.naturalWidth > 0 && (img.naturalWidth / img.naturalHeight) > 1.2)
          .map(img => img.src)
          // Only Pinterest CDN images in high-res paths
          .filter(src => src && (
            src.includes('/236x/') ||
            src.includes('/474x/') ||
            src.includes('/736x/') ||
            src.includes('/originals/')
          ))
          // Upgrade to originals resolution
          .map(src => src.replace(/\/\d+x\//, '/originals/'));
      });

      for (const url of urls) {
        if (scrapedUrls.size >= count) break;
        scrapedUrls.add(url);
      }

      if (scrapedUrls.size >= count) break;

      // Scroll to load more pins
      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 3));
      await page.waitForTimeout(2500);
      scrollAttempts++;
    }

    logger.info(`[Scraper] Found ${scrapedUrls.size} URLs for "${category}". Starting download...`);

  } catch (err) {
    logger.error(`[Scraper] Browser error for "${category}": ${err.message}`);
    return 0;
  } finally {
    // Always close the browser, whether success or error
    await browser.close();
  }

  // ── Download phase ────────────────────────────────────────────────────────
  // scrapedUrls is accessible here because it was declared before the try block

  let downloaded = 0;
  const urlArray = [...scrapedUrls];

  for (const url of urlArray) {
    try {
      const urlObj = new URL(url);
      const filename = path.basename(urlObj.pathname);
      const destPath = path.join(targetDir, `pin_${category}_${filename}`);

      // Skip if already exists
      if (existsSync(destPath)) {
        logger.info(`[Scraper] Skip (exists): ${filename}`);
        continue;
      }

      await downloadImage(url, destPath);
      downloaded++;
      logger.info(`[Scraper] Downloaded [${downloaded}/${urlArray.length}] (${category}): ${filename}`);
    } catch (err) {
      logger.warn(`[Scraper] Failed to download ${url}: ${err.message}`);
    }
  }

  logger.success(`[Scraper] "${category}" complete — ${downloaded} new images saved to ${targetDir}`);
  return downloaded;
}

// ── CLI entry-point ───────────────────────────────────────────────────────────

// Only run as a script if this file was invoked directly via `node`
const isMain = process.argv[1] && (
  path.resolve(process.argv[1]) === path.resolve(__filename) ||
  process.argv[1].endsWith('pinterest.js')
);

if (isMain) {
  const arg = process.argv.slice(2).join(' ') || 'anime';

  // Try to find an exact category match, otherwise use the raw string as a query
  const category = Object.keys(CATEGORY_QUERIES).find(k => k === arg) || arg;
  const targetDir = path.join(config.localDir, category);

  logger.info(`CLI mode: category="${category}"`);

  scrapeCategory(category, config.scrapeCount, targetDir).catch(err => {
    logger.error('Scraper failed:', err);
    process.exit(1);
  });
}
