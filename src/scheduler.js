/**
 * scheduler.js
 *
 * Configures node-cron to run the wallpaper update on the configured schedule.
 * Runs immediately on startup, then on the cron interval.
 */

import cron from 'node-cron';
import config from './config.js';
import * as logger from './logger.js';
import { updateWallpaper } from './wallpaperManager.js';

/**
 * Starts the wallpaper scheduler.
 *
 * Behaviour:
 *  1. Runs one update immediately when called.
 *  2. Schedules subsequent runs via node-cron using config.cronExpression.
 *
 * @returns {void}
 */
export function startScheduler() {
  logger.info(`Scheduler starting. Interval: every ${config.intervalDisplay}.`);
  logger.info(`Cron expression: "${config.cronExpression}"`);

  // ── Immediate first run ────────────────────────────────────────────────────
  // Run immediately so the user sees a wallpaper change right away on startup.
  updateWallpaper()
    .then(() => {
      logger.info(`Next update in ${config.intervalDisplay}.`);
    })
    .catch((err) => {
      // updateWallpaper should never throw, but catch defensively
      logger.error('Unexpected error during initial wallpaper update.', err);
    });

  // ── Recurring scheduled run ────────────────────────────────────────────────
  cron.schedule(config.cronExpression, async () => {
    logger.info('Scheduled wallpaper update triggered.');
    await updateWallpaper();
    logger.info(`Next update in ${config.intervalDisplay}.`);
  });
}
