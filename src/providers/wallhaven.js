/**
 * providers/wallhaven.js
 *
 * Wallhaven provider - fetches a random wallpaper via the Wallhaven API.
 *
 * API Docs: https://wallhaven.cc/help/api
 * No strict rate limit for basic use; API key unlocks NSFW content (not used here).
 *
 * Notes:
 *  - Wallhaven uses tag-based search. Categories not matching a Wallhaven tag
 *    are mapped to sensible alternatives below.
 *  - "anime" is a supported first-class category on Wallhaven.
 */

import axios from 'axios';
import config from '../config.js';

const BASE_URL = 'https://wallhaven.cc/api/v1';

/**
 * Maps generic category names to Wallhaven-friendly search queries.
 */
const CATEGORY_MAP = {
  nature:       'nature',
  mountains:    'mountains landscape',
  minimal:      'minimalist',
  space:        'space galaxy',
  cyberpunk:    'cyberpunk neon',
  programming:  'programming code developer',
  dark:         'dark aesthetic',
  abstract:     'abstract',
  architecture: 'architecture city',
  anime:        'anime',
};

/**
 * Fetches a random wallpaper from Wallhaven matching the given category.
 *
 * Returns an object with:
 *   - id        {string}  Unique Wallhaven wallpaper ID
 *   - url       {string}  Direct download URL for the full image
 *   - sourceId  {string}  Prefixed unique key for history: "wallhaven_<id>"
 *
 * @param {string} category - Category keyword.
 * @returns {Promise<{ id: string, url: string, sourceId: string }>}
 */
export async function getRandomWallpaper(category) {
  // Map generic category to a Wallhaven search query
  const query = CATEGORY_MAP[category] || category;

  // Pick a random page from the first 10 to maximise variety
  const randomPage = Math.floor(Math.random() * 10) + 1;

  const params = {
    q:          query,
    categories: '110',   // General + Anime (no People)
    purity:     '100',   // SFW only
    sorting:    'random',
    order:      'desc',
    page:       randomPage,
    atleast:    '1920x1080',
  };

  // Attach API key if provided (unlocks more results)
  if (config.wallhavenKey) {
    params.apikey = config.wallhavenKey;
  }

  const response = await axios.get(`${BASE_URL}/search`, {
    params,
    timeout: 15_000,
  });

  const wallpapers = response.data?.data;

  if (!wallpapers || wallpapers.length === 0) {
    throw new Error(
      `Wallhaven returned no wallpapers for category "${category}" (query: "${query}").`
    );
  }

  // Pick a random wallpaper from the page
  const wallpaper = wallpapers[Math.floor(Math.random() * wallpapers.length)];

  if (!wallpaper.path) {
    throw new Error('Wallhaven returned a wallpaper with no download URL.');
  }

  return {
    id:       wallpaper.id,
    url:      wallpaper.path,
    sourceId: `wallhaven_${wallpaper.id}`,
  };
}
