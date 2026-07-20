/**
 * config.js
 * Minimal config — local wallpapers only, no scheduling, no API keys.
 */

import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Valid categories ───────────────────────────────────────────────────────────

export const VALID_CATEGORIES = [
  'cyberpunk', 'programming', 'dark', 'abstract', 'architecture',
  'anime', 'aesthetic', 'lofi', 'gaming', 'cars', 'city',
  'nature', 'space', 'minimal', 'mountains',
];

// ── Validation helper ─────────────────────────────────────────────────────────

function assertOneOf(value, allowed, name) {
  if (!allowed.includes(value)) {
    throw new Error(`Invalid ${name}: "${value}". Allowed: ${allowed.join(', ')}`);
  }
}

// ── Build config ──────────────────────────────────────────────────────────────

// CATEGORY supports a comma-separated list  e.g. CATEGORY=anime,cyberpunk
const categories = (process.env.CATEGORY || 'anime')
  .split(',')
  .map(c => c.trim().toLowerCase())
  .filter(Boolean);

categories.forEach(cat => assertOneOf(cat, VALID_CATEGORIES, 'CATEGORY'));

const PROJECT_ROOT = path.resolve(__dirname, '..');

const config = {
  // Wallpaper categories to rotate across
  categories,

  // History / duplicate prevention
  keepHistory:      process.env.KEEP_HISTORY !== 'false',
  historyMaxSize:   parseInt(process.env.HISTORY_MAX_SIZE || '5000', 10),

  // After a wallpaper is set, delete it from the local folder
  autoDeleteUsed: process.env.AUTO_DELETE_USED === 'true',

  // Auto-scrape settings
  scrapeThreshold: parseInt(process.env.SCRAPE_THRESHOLD || '20', 10),
  scrapeCount:     parseInt(process.env.SCRAPE_COUNT     || '40', 10),

  // Paths
  cacheDir:     path.join(PROJECT_ROOT, 'cache'),
  currentImage: path.join(PROJECT_ROOT, 'cache', 'current.jpg'),
  historyFile:  path.join(PROJECT_ROOT, 'cache', 'history.json'),
  localDir:     path.join(PROJECT_ROOT, 'wallpapers'),
};

export default config;
