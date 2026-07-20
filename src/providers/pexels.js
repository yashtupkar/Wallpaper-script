/**
 * providers/pexels.js
 *
 * Pexels provider - fetches a random wallpaper via the Pexels API.
 *
 * API Docs: https://www.pexels.com/api/documentation/
 * Free tier: 200 requests/hour, 20,000/month
 */

import axios from 'axios';
import config from '../config.js';

const BASE_URL = 'https://api.pexels.com/v1';

/**
 * Fetches a random landscape photo matching the given category.
 *
 * Returns an object with:
 *   - id        {string}  Unique Pexels photo ID
 *   - url       {string}  Direct download URL for a high-resolution JPEG
 *   - sourceId  {string}  Prefixed unique key for history: "pexels_<id>"
 *
 * @param {string} category - Search keyword.
 * @returns {Promise<{ id: string, url: string, sourceId: string }>}
 */
export async function getRandomWallpaper(category) {
  if (!config.pexelsKey) {
    throw new Error('Pexels API key is not configured (PEXELS_KEY in .env).');
  }

  // Search returns paginated results; we pick a random page to maximise variety.
  // Pexels caps accessible pages to keep total results under their limit.
  const randomPage = Math.floor(Math.random() * 20) + 1;

  const response = await axios.get(`${BASE_URL}/search`, {
    headers: {
      Authorization: config.pexelsKey,
    },
    params: {
      query:       category,
      orientation: 'landscape',
      size:        'large',       // Minimum 1920x1080
      per_page:    15,
      page:        randomPage,
    },
    timeout: 15_000,
  });

  const photos = response.data?.photos;

  if (!photos || photos.length === 0) {
    throw new Error(
      `Pexels returned no photos for category "${category}" on page ${randomPage}.`
    );
  }

  // Pick a random photo from the page results
  const photo = photos[Math.floor(Math.random() * photos.length)];

  // Prefer "original" size, fall back to "large2x"
  const downloadUrl = photo.src?.original || photo.src?.large2x;

  if (!downloadUrl) {
    throw new Error('Pexels returned a photo with no usable download URL.');
  }

  return {
    id:       String(photo.id),
    url:      downloadUrl,
    sourceId: `pexels_${photo.id}`,
  };
}
