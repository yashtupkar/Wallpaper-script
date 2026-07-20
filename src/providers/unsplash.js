/**
 * providers/unsplash.js
 *
 * Unsplash provider - fetches a random wallpaper via the Unsplash API.
 *
 * API Docs: https://unsplash.com/documentation#get-a-random-photo
 * Free tier: 50 requests/hour
 */

import axios from 'axios';
import config from '../config.js';
import * as logger from '../logger.js';

const BASE_URL = 'https://api.unsplash.com';

/**
 * Fetches a random landscape-oriented photo for the given category.
 *
 * Returns an object with:
 *   - id        {string}  Unique Unsplash photo ID
 *   - url       {string}  Direct download URL for a full-resolution JPEG
 *   - sourceId  {string}  Prefixed unique key for history: "unsplash_<id>"
 *
 * @param {string} category - Search term / topic keyword.
 * @returns {Promise<{ id: string, url: string, sourceId: string }>}
 */
export async function getRandomWallpaper(category) {
  if (!config.unsplashKey) {
    throw new Error('Unsplash API key is not configured (UNSPLASH_KEY in .env).');
  }

  const response = await axios.get(`${BASE_URL}/photos/random`, {
    headers: {
      Authorization: `Client-ID ${config.unsplashKey}`,
    },
    params: {
      query:       category,
      orientation: 'landscape',
      content_filter: 'high',  // Safe content only
    },
    timeout: 15_000,
  });

  const photo = response.data;

  // Prefer the highest quality download URL available
  const downloadUrl =
    photo.urls?.raw
      ? `${photo.urls.raw}&w=2560&q=90&fm=jpg&fit=max`
      : photo.urls?.full;

  if (!downloadUrl) {
    throw new Error('Unsplash returned a photo with no usable download URL.');
  }

  return {
    id:       photo.id,
    url:      downloadUrl,
    sourceId: `unsplash_${photo.id}`,
  };
}
