/**
 * config.js
 * Loads and validates all environment variables, returning a typed config object.
 */

import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Valid option sets ─────────────────────────────────────────────────────────

const VALID_SOURCES = ['unsplash', 'pexels', 'wallhaven', 'local'];

const VALID_CATEGORIES = [
  'cyberpunk',
  'programming',
  'dark',
  'abstract',
  'architecture',
  'anime',
  'aesthetic',
  'lofi',
  'gaming',
  'cars',
  'city',
  'nature',
  'space',
  'minimal',
  'mountains',
];

export { VALID_CATEGORIES };

/**
 * Maps human-readable interval strings to node-cron expressions.
 */
const INTERVAL_TO_CRON = {
  '1m':    '*/1 * * * *',
  '5m':    '*/5 * * * *',
  '15m':   '*/15 * * * *',
  '30m':   '*/30 * * * *',
  '1h':    '0 * * * *',
  '6h':    '0 */6 * * *',
  '12h':   '0 */12 * * *',
  'daily': '0 8 * * *',   // Every day at 08:00
};

/**
 * Maps interval keys to human-readable display strings for logging.
 */
const INTERVAL_DISPLAY = {
  '1m':    '1 minute',
  '5m':    '5 minutes',
  '15m':   '15 minutes',
  '30m':   '30 minutes',
  '1h':    '1 hour',
  '6h':    '6 hours',
  '12h':   '12 hours',
  'daily': '24 hours (daily at 08:00)',
};

// ── Validation helpers ────────────────────────────────────────────────────────

/**
 * Asserts that a value is one of the allowed options, throwing on failure.
 * @param {string} value
 * @param {string[]} allowed
 * @param {string} name - Field name for error messages.
 */
function assertOneOf(value, allowed, name) {
  if (!allowed.includes(value)) {
    throw new Error(
      `Invalid ${name}: "${value}". Allowed values: ${allowed.join(', ')}`
    );
  }
}

// ── Build config ──────────────────────────────────────────────────────────────

const source   = (process.env.SOURCE || 'unsplash').toLowerCase();
const interval = (process.env.CHANGE_INTERVAL || '1h').toLowerCase();

// CATEGORY supports a comma-separated list for multi-category rotation.
// e.g. CATEGORY=cyberpunk,anime,aesthetic
const categories = (process.env.CATEGORY || 'minimal')
  .split(',')
  .map((c) => c.trim().toLowerCase())
  .filter(Boolean);

// Validate every category in the list
categories.forEach((cat) => assertOneOf(cat, VALID_CATEGORIES, 'CATEGORY'));

assertOneOf(source,   VALID_SOURCES,             'SOURCE');
assertOneOf(interval, Object.keys(INTERVAL_TO_CRON), 'CHANGE_INTERVAL');

/** Root of the project (one level above /src) */
const PROJECT_ROOT = path.resolve(__dirname, '..');

const config = {
  // API Keys
  unsplashKey:          process.env.UNSPLASH_KEY          || '',
  pexelsKey:            process.env.PEXELS_KEY            || '',
  wallhavenKey:         process.env.WALLHAVEN_KEY         || '',

  // Wallpaper settings
  source,
  categories,                      // Array of all configured categories
  category: categories[0],         // Primary / fallback category (first in list)

  // Scheduling
  interval,
  cronExpression: INTERVAL_TO_CRON[interval],
  intervalDisplay: INTERVAL_DISPLAY[interval],

  // History / duplicate prevention
  keepHistory:     process.env.KEEP_HISTORY !== 'false', // default true
  historyMaxSize:  parseInt(process.env.HISTORY_MAX_SIZE || '5000', 10),

  // Auto-scrape settings
  scrapeThreshold: parseInt(process.env.SCRAPE_THRESHOLD || '20', 10),  // Trigger scrape when a category has fewer than this many images
  scrapeCount:     parseInt(process.env.SCRAPE_COUNT     || '40', 10),  // Number of images to scrape per category per run

  // Paths
  cacheDir:     path.join(PROJECT_ROOT, 'cache'),
  currentImage: path.join(PROJECT_ROOT, 'cache', 'current.jpg'),
  historyFile:  path.join(PROJECT_ROOT, 'cache', 'history.json'),
  localDir:     path.join(PROJECT_ROOT, 'wallpapers'),
};

export default config;
