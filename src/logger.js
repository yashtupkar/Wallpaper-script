/**
 * logger.js
 * Clean, timestamped console logging utility.
 */

/**
 * Returns an ISO timestamp prefix for log lines.
 * @returns {string}
 */
function timestamp() {
  return new Date().toISOString();
}

/**
 * Log an informational message.
 * @param {string} message
 */
export function info(message) {
  console.log(`[INFO]  ${timestamp()} - ${message}`);
}

/**
 * Log a warning message.
 * @param {string} message
 */
export function warn(message) {
  console.warn(`[WARN]  ${timestamp()} - ${message}`);
}

/**
 * Log an error message.
 * @param {string} message
 * @param {Error} [error] - Optional Error object for stack trace in debug mode.
 */
export function error(message, err) {
  console.error(`[ERROR] ${timestamp()} - ${message}`);
  if (err) {
    console.error(err.stack || err);
  }
}

/**
 * Log a success message (styled as info with a marker).
 * @param {string} message
 */
export function success(message) {
  console.log(`[OK]    ${timestamp()} - ${message}`);
}
