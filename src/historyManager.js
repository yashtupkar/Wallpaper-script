/**
 * historyManager.js
 *
 * Manages the persistent wallpaper history stored in cache/history.json.
 * Prevents duplicate wallpapers across restarts, reboots, and scheduled runs.
 *
 * Format: JSON array of sourceId strings, newest entries at the end.
 * Maximum size: config.historyMaxSize (default 5,000 entries).
 */

import fs from 'fs/promises';
import config from './config.js';
import * as logger from './logger.js';

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Loads the history file and returns an array of sourceId strings.
 * Returns an empty array if the file does not yet exist or is malformed.
 *
 * @returns {Promise<string[]>}
 */
export async function loadHistory() {
  try {
    const raw = await fs.readFile(config.historyFile, 'utf-8');
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      logger.warn('history.json is not an array – resetting history.');
      return [];
    }

    return parsed;
  } catch (err) {
    if (err.code === 'ENOENT') {
      // File doesn't exist yet – this is expected on first run
      return [];
    }
    logger.warn(`Could not read history file: ${err.message}. Starting with empty history.`);
    return [];
  }
}

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Saves the history array to disk.
 * @param {string[]} history
 * @returns {Promise<void>}
 */
async function saveHistory(history) {
  await fs.writeFile(config.historyFile, JSON.stringify(history, null, 2), 'utf-8');
}

// ── Add entry ─────────────────────────────────────────────────────────────────

/**
 * Appends a new sourceId to the history, trimming oldest entries if the
 * maximum size is exceeded, then persists to disk.
 *
 * @param {string} sourceId - Prefixed ID string, e.g. "unsplash_abc123".
 * @returns {Promise<void>}
 */
export async function addToHistory(sourceId) {
  const history = await loadHistory();

  // Avoid exact duplicates (shouldn't happen in normal flow, but be safe)
  if (history.includes(sourceId)) return;

  history.push(sourceId);

  // Trim to maximum allowed size, removing the oldest (front) entries
  const maxSize = config.historyMaxSize;
  const trimmed = history.length > maxSize ? history.slice(history.length - maxSize) : history;

  await saveHistory(trimmed);
}

// ── Clear ─────────────────────────────────────────────────────────────────────

/**
 * Wipes the history file entirely. Useful for debugging / manual reset.
 * @returns {Promise<void>}
 */
export async function clearHistory() {
  await saveHistory([]);
  logger.info('Wallpaper history cleared.');
}
