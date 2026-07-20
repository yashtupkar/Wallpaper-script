# Windows Wallpaper Changer

A Node.js script that automatically rotates your Windows desktop wallpaper from a **local image library**. It runs once and exits — scheduling is handled by Windows Task Scheduler so there's no persistent process to manage.

Images are sourced from **Pinterest** via an automated Playwright-based scraper (no API key required).

---

## Features

- 🖼️ **Local-first** — wallpapers live in `wallpapers/<category>/` folders; no API calls at change time
- 🤖 **Auto-scrape** — if a category drops below the threshold, Pinterest is scraped silently in the background
- 🗑️ **Auto-delete** — optionally delete each wallpaper after it's used, keeping the library perpetually fresh
- 🔁 **Duplicate prevention** — history file prevents the same image from appearing twice
- 🗂️ **15 categories** — anime, cyberpunk, dark, aesthetic, lofi, nature, space, minimal, and more
- ⚡ **Run-and-exit** — pairs perfectly with Windows Task Scheduler; no long-running Node process
- 🔒 **Resilient** — full error handling; failed scrapes never block wallpaper selection

---

## Project Structure

```
Wallpaper-script/
│
├── src/
│   ├── providers/
│   │   └── local.js           ← Picks a random image from wallpapers/
│   │
│   ├── scraper/
│   │   ├── pinterest.js       ← Playwright-based Pinterest scraper
│   │   ├── autoScraper.js     ← Fires background scrapes when stock is low
│   │   └── scrapeAll.js       ← Manually scrape every configured category
│   │
│   ├── config.js              ← Loads & validates .env
│   ├── logger.js              ← Coloured console logger
│   ├── downloader.js          ← Downloads images to wallpapers/<category>/
│   ├── historyManager.js      ← Duplicate-prevention history
│   └── index.js               ← Entry point (run-and-exit)
│
├── wallpapers/
│   ├── anime/                 ← Scraped anime wallpapers
│   ├── cyberpunk/             ← Scraped cyberpunk wallpapers
│   └── …                     ← One folder per category
│
├── cache/
│   ├── current.jpg            ← Active wallpaper (auto-managed)
│   └── history.json           ← Seen wallpaper IDs (auto-managed)
│
├── .env                       ← Your personal config
├── package.json
└── README.md
```

---

## Installation

```powershell
# 1. Clone / download the project
cd D:\Wallpaper-script

# 2. Install dependencies
npm install

# 3. Install Playwright browser (used by the Pinterest scraper)
npx playwright install chromium
```

> **Node ≥ 18** is required.

---

## Quick Start

```powershell
# Manually trigger one wallpaper change
npm start

# Pre-fill the library before scheduling (optional but recommended)
npm run scrape:all
```

`npm start` will:
1. Print a startup banner with your current config
2. Scan `wallpapers/` for available images
3. Trigger background Pinterest scrapes for any category below the threshold
4. Pick a random image, set it as the desktop wallpaper, and exit
5. Delete the used file from disk (if `AUTO_DELETE_USED=true`)

```
╔══════════════════════════════════════════════╗
║       🖼  Windows Wallpaper Changer          ║
╚══════════════════════════════════════════════╝

[INFO]  2026-07-20T18:00:00.000Z - Categories : anime, cyberpunk, dark, aesthetic, lofi
[INFO]  2026-07-20T18:00:00.000Z - Auto-scrape: trigger < 20 images/category, fetch 40 per run

[INFO]  2026-07-20T18:00:00.112Z - [LocalProvider] Image pool: 174 total (anime:29, cyberpunk:30, dark:32, aesthetic:28, lofi:29, misc:26)
[OK]    2026-07-20T18:00:00.254Z - ✔ Wallpaper set: D:\Wallpaper-script\wallpapers\cyberpunk\pin_cyberpunk_a3a4223d.jpg
[INFO]  2026-07-20T18:00:00.260Z - 🗑  Deleted used wallpaper: …\cyberpunk\pin_cyberpunk_a3a4223d.jpg
```

---

## Configuration

Edit `.env` to customise behaviour:

| Variable           | Default | Description                                                      |
|--------------------|---------|------------------------------------------------------------------|
| `CATEGORY`         | `anime` | Comma-separated list of active categories (see below)            |
| `KEEP_HISTORY`     | `true`  | Prevent duplicate wallpapers (`true` / `false`)                  |
| `HISTORY_MAX_SIZE` | `5000`  | Max IDs stored in history before it is trimmed                   |
| `SCRAPE_THRESHOLD` | `20`    | Trigger a scrape when a category has fewer than this many images |
| `SCRAPE_COUNT`     | `40`    | Images to download per category per auto-scrape run              |
| `AUTO_DELETE_USED` | `true`  | Delete a wallpaper from disk after it has been set               |

### Available Categories

| Category       | Description                              |
|----------------|------------------------------------------|
| `anime`        | Anime art and illustrations              |
| `aesthetic`    | Pastel, soft, dreamy visuals             |
| `lofi`         | Lo-fi / chill aesthetic scenes           |
| `cyberpunk`    | Neon-lit futuristic cityscapes           |
| `dark`         | Dark, moody atmospheres                  |
| `programming`  | Code, developer aesthetic, tech          |
| `abstract`     | Abstract art and patterns                |
| `architecture` | Buildings, bridges, city structure       |
| `nature`       | Forests, rivers, green landscapes        |
| `mountains`    | Mountain ranges, peaks, snow             |
| `minimal`      | Clean, simple, minimalist compositions   |
| `space`        | Galaxies, nebulae, planets               |
| `gaming`       | Game art and screenshots                 |
| `cars`         | Cars and motorsport                      |
| `city`         | Urban cityscapes                         |

Use a comma-separated list in `.env`:

```env
CATEGORY=anime,cyberpunk,dark,aesthetic,lofi
```

---

## Auto-Delete Behaviour

When `AUTO_DELETE_USED=true` (the default), each wallpaper file is **deleted from disk immediately after it is set**. This means:

- The library is self-pruning — you never see the same image twice
- The auto-scraper automatically refills any category that drops below `SCRAPE_THRESHOLD`
- Set `AUTO_DELETE_USED=false` to keep files on disk (history file still prevents repeats)

---

## Scraping Manually

To bulk-download images before your first scheduled run:

```powershell
# Scrape all configured categories
npm run scrape:all

# Run the Pinterest scraper directly (useful for debugging)
npm run scrape:pinterest
```

---

## Windows Task Scheduler Setup

The script is designed to **run once and exit**. Windows Task Scheduler calls it on a repeating schedule — no persistent Node process is needed.

### Step 1 — Open Task Scheduler

Press `Win + R`, type `taskschd.msc`, and press **Enter**.

### Step 2 — Create a New Task

In the right panel, click **Create Task…** (not "Create Basic Task").

### Step 3 — General Tab

| Field                       | Value                                          |
|-----------------------------|------------------------------------------------|
| Name                        | `Wallpaper Changer`                            |
| Description                 | `Rotates desktop wallpaper from local library` |
| Security options            | **Run only when user is logged on**            |
| Run with highest privileges | ✅ Checked                                      |

> Keep **Run only when user is logged on** — setting a wallpaper requires an active desktop session.

### Step 4 — Triggers Tab

#### Trigger 1: Repeating schedule

Click **New…** and configure:

| Setting           | Value                |
|-------------------|----------------------|
| Begin the task    | **On a schedule**    |
| Settings          | **Daily**            |
| Repeat task every | **30 minutes**       |
| For a duration of | **Indefinitely**     |
| Enabled           | ✅ Checked            |

Click **OK**.

#### Trigger 2: At log on (optional)

Click **New…** again:

| Setting        | Value              |
|----------------|--------------------|
| Begin the task | **At log on**      |
| Specific user  | *(your Windows user)* |
| Delay task for | `30 seconds`       |
| Enabled        | ✅ Checked          |

Click **OK**.

### Step 5 — Actions Tab

Click **New…** and configure:

| Setting        | Value                   |
|----------------|-------------------------|
| Action         | **Start a program**     |
| Program/script | `node`                  |
| Add arguments  | `src/index.js`          |
| Start in       | `D:\Wallpaper-script`   |

> If `node` is not in your PATH, use the full path:
> `C:\Program Files\nodejs\node.exe`

Click **OK**.

### Step 6 — Conditions Tab

| Setting                                            | Value       |
|----------------------------------------------------|-------------|
| Start the task only if the computer is on AC power | ❌ Uncheck  |

*(Important for laptops — ensures it runs on battery too.)*

### Step 7 — Settings Tab

| Setting                                                     | Value      |
|-------------------------------------------------------------|------------|
| Allow task to be run on demand                              | ✅ Check   |
| If the task is already running, do not start a new instance | ✅ Check   |
| Stop the task if it runs longer than                        | ❌ Uncheck |

### Step 8 — Save

Click **OK** and enter your Windows password if prompted.

---

### Managing the Task via PowerShell

```powershell
# Manually trigger the task right now
schtasks /run /tn "Wallpaper Changer"

# Check task status and last run result
schtasks /query /tn "Wallpaper Changer" /fo LIST /v

# Disable the task (stops automatic runs)
schtasks /change /tn "Wallpaper Changer" /disable

# Re-enable the task
schtasks /change /tn "Wallpaper Changer" /enable

# Delete the task entirely
schtasks /delete /tn "Wallpaper Changer" /f
```

---

### Running Silently (No Console Window Flash)

By default, Windows briefly shows a console window when the task runs. To suppress it, create a VBScript wrapper:

**`run-silent.vbs`** (save in project root `D:\Wallpaper-script\`):

```vbscript
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "node src/index.js", 0, False
```

Then update the Task Scheduler Action:

| Setting        | Value                                    |
|----------------|------------------------------------------|
| Program/script | `wscript.exe`                            |
| Add arguments  | `D:\Wallpaper-script\run-silent.vbs`     |
| Start in       | `D:\Wallpaper-script`                    |

---

## Troubleshooting

### "No wallpaper images found"

The `wallpapers/` folder is empty. Run:

```powershell
npm run scrape:all
```

### "All wallpapers have been seen"

The history contains every image ID. Reset it:

```powershell
del cache\history.json
```

Or use `AUTO_DELETE_USED=true` so images are deleted after use — history becomes unnecessary.

### Pinterest scraper fails

- Ensure Playwright Chromium is installed: `npx playwright install chromium`
- Pinterest may throttle scraping — reduce `SCRAPE_COUNT` in `.env`
- Run `npm run scrape:pinterest` in a visible terminal to watch the browser

### Task Scheduler runs but wallpaper doesn't change

- Check **Last Run Result** in Task Scheduler — `0x0` means success; anything else is an error code
- Confirm **Start in** is set to `D:\Wallpaper-script`
- Make sure `node` is in the system PATH or use the full `node.exe` path in the action

### Wallpaper doesn't change on battery

In the Conditions tab, uncheck **Start the task only if the computer is on AC power**.

---

## Resetting History

```powershell
del cache\history.json
```

The file is recreated automatically on the next run.

---

## License

MIT — free for personal use.

 – Unsplash, Pexels, Wallhaven (easily extensible)
- 🔁 **Duplicate prevention** – never shows the same wallpaper twice (persisted across reboots)
- ⏱️ **Flexible scheduling** – 15 min, 30 min, 1 h, 6 h, 12 h, or daily
- 🗂️ **10 categories** – nature, mountains, minimal, space, cyberpunk, programming, dark, abstract, architecture, anime
- 🖥️ **Windows-native** – sets wallpaper via the `wallpaper` npm package
- 🔒 **Never crashes** – full retry logic and graceful error handling

---

## Project Structure

```
wallpaper-changer/
│
├── src/
│   ├── providers/
│   │   ├── unsplash.js        ← Unsplash API provider
│   │   ├── pexels.js          ← Pexels API provider
│   │   └── wallhaven.js       ← Wallhaven API provider
│   │
│   ├── config.js              ← Loads & validates .env
│   ├── logger.js              ← Clean console logger
│   ├── downloader.js          ← Downloads image to cache/
│   ├── historyManager.js      ← Duplicate-prevention history
│   ├── wallpaperManager.js    ← Orchestrates the update cycle
│   ├── scheduler.js           ← node-cron scheduling
│   └── index.js               ← Entry point
│
├── cache/
│   ├── current.jpg            ← Active wallpaper (auto-managed)
│   └── history.json           ← Seen wallpaper IDs (auto-managed)
│
├── .env                       ← Your personal config (create from .env.example)
├── .env.example               ← Config template
├── package.json
└── README.md
```

---

## Installation

```bash
# 1. Clone / download the project
cd wallpaper-changer

# 2. Install dependencies
npm install

# 3. Copy the example config
copy .env.example .env
```

---

## API Key Setup

### Unsplash (free, 50 req/hour)

1. Go to <https://unsplash.com/developers>
2. Click **New Application**
3. Copy your **Access Key**
4. Set `UNSPLASH_KEY=<your key>` in `.env`

### Pexels (free, 200 req/hour)

1. Go to <https://www.pexels.com/api/>
2. Click **Get Started** and register
3. Copy your **API Key**
4. Set `PEXELS_KEY=<your key>` in `.env`

### Wallhaven (optional, mostly free)

1. Go to <https://wallhaven.cc/settings/account>
2. Scroll to **API Key** and generate one
3. Set `WALLHAVEN_KEY=<your key>` in `.env`
4. Without a key, Wallhaven still works for SFW content

> **Note**: You only need a key for the provider you select via `SOURCE=`.

---

## Running Locally

```bash
npm start
```

The application will:
1. Print a startup banner with your current config
2. Change the wallpaper immediately
3. Continue changing it on the configured interval

```
╔══════════════════════════════════════════════╗
║       🖼  Windows Wallpaper Changer          ║
╚══════════════════════════════════════════════╝

[INFO]  2024-01-15T10:00:00.000Z - Provider  : unsplash
[INFO]  2024-01-15T10:00:00.000Z - Category  : minimal
[INFO]  2024-01-15T10:00:00.000Z - Interval  : 1 hour
[INFO]  2024-01-15T10:00:00.000Z - History   : enabled (max 5000 entries)

[INFO]  2024-01-15T10:00:00.000Z - Fetching wallpaper from "unsplash" [category: minimal]...
[INFO]  2024-01-15T10:00:01.000Z - Downloading wallpaper...
[INFO]  2024-01-15T10:00:03.000Z - Download complete.
[OK]    2024-01-15T10:00:03.000Z - Wallpaper changed successfully. [unsplash_abc123]
[INFO]  2024-01-15T10:00:03.000Z - Next update in 1 hour.
```

---

## Configuration

Edit `.env` to customise the application:

| Variable          | Default     | Description                                              |
|-------------------|-------------|----------------------------------------------------------|
| `UNSPLASH_KEY`    | *(empty)*   | Unsplash API Access Key                                  |
| `PEXELS_KEY`      | *(empty)*   | Pexels API Key                                           |
| `WALLHAVEN_KEY`   | *(empty)*   | Wallhaven API Key (optional)                             |
| `SOURCE`          | `unsplash`  | Provider: `unsplash`, `pexels`, `wallhaven`              |
| `CATEGORY`        | `minimal`   | Wallpaper category (see list below)                      |
| `CHANGE_INTERVAL` | `1h`        | How often to change: `15m`, `30m`, `1h`, `6h`, `12h`, `daily` |
| `KEEP_HISTORY`    | `true`      | Prevent duplicate wallpapers (`true`/`false`)            |
| `HISTORY_MAX_SIZE`| `5000`      | Max wallpaper IDs stored in history                      |

### Available Categories

| Category       | Notes                                    |
|----------------|------------------------------------------|
| `nature`       | Forests, rivers, green landscapes        |
| `mountains`    | Mountain ranges, peaks, snow             |
| `minimal`      | Clean, simple, minimalist compositions   |
| `space`        | Galaxies, nebulae, planets               |
| `cyberpunk`    | Neon-lit futuristic cityscapes           |
| `programming`  | Code, developer aesthetic, tech          |
| `dark`         | Dark moody atmospheres                   |
| `abstract`     | Abstract art and patterns                |
| `architecture` | Buildings, bridges, city structure       |
| `anime`        | Anime art (best with Wallhaven)          |

---

## Windows Task Scheduler Setup

Configure Windows Task Scheduler to start the wallpaper changer automatically when Windows starts, running silently in the background.

### Step-by-Step

1. **Open Task Scheduler**
   Press `Win + R`, type `taskschd.msc`, and press Enter.

2. **Create a New Task**
   In the right panel, click **Create Task…** (not "Create Basic Task").

3. **General Tab**
   - Name: `Wallpaper Changer`
   - Description: `Automatically changes desktop wallpaper`
   - Select: **Run whether user is logged on or not** *(optional – hides the window)*
   - Check: **Run with highest privileges** *(may be needed on some systems)*

4. **Triggers Tab**
   - Click **New…**
   - Begin the task: **At log on**
   - Specific user: *(your Windows user)*
   - Delay task for: `30 seconds` *(gives Windows time to fully start)*
   - Click **OK**

5. **Actions Tab**
   - Click **New…**
   - Action: **Start a program**
   - Program/script: `node`
   - Add arguments: `src/index.js`
   - Start in: `D:\Wallpaper-script` *(full path to your project folder)*
   - Click **OK**

   > **Alternative** – If `node` isn't in PATH, use the full path:
   > `C:\Program Files\nodejs\node.exe`

6. **Conditions Tab**
   - Uncheck: **Start the task only if the computer is on AC power**
   *(important for laptops)*

7. **Settings Tab**
   - Check: **If the task is already running, do not start a new instance**
   - Uncheck: **Stop the task if it runs longer than**

8. **Click OK** and enter your Windows password if prompted.

### Verify It Works

```powershell
# Manually trigger the task to test
schtasks /run /tn "Wallpaper Changer"
```

Check Task Manager → Details to see `node.exe` running.

### Stop the Background Task

```powershell
schtasks /end /tn "Wallpaper Changer"
```

### Disable Auto-Start

Open Task Scheduler, find **Wallpaper Changer**, right-click → **Disable**.

---

## Adding a New Provider

1. Create a new file: `src/providers/myprovider.js`

2. Export a single function:

```js
// src/providers/myprovider.js
export async function getRandomWallpaper(category) {
  // Fetch from your API...
  return {
    id:       'unique-photo-id',
    url:      'https://example.com/image.jpg',
    sourceId: `myprovider_unique-photo-id`,  // Must be globally unique
  };
}
```

3. Register it in `src/wallpaperManager.js`:

```js
const providers = {
  unsplash:   () => import('./providers/unsplash.js'),
  pexels:     () => import('./providers/pexels.js'),
  wallhaven:  () => import('./providers/wallhaven.js'),
  myprovider: () => import('./providers/myprovider.js'),  // ← add this
};
```

4. Add it to the valid sources list in `src/config.js`:

```js
const VALID_SOURCES = ['unsplash', 'pexels', 'wallhaven', 'myprovider'];
```

5. Set `SOURCE=myprovider` in `.env`.

---

## Troubleshooting

### Wallpaper doesn't change

- Check the console for `[ERROR]` lines.
- Verify your API key is set correctly in `.env`.
- Make sure `SOURCE=` matches your key (e.g., don't set `SOURCE=unsplash` with only a Pexels key).
- Try running `npm start` in a terminal and watching the output.

### "No unique wallpaper found after 20 attempts"

Your history is full of wallpapers from the current category. Try:
- Changing `CATEGORY=` in `.env`
- Deleting `cache/history.json` to reset history
- Changing `SOURCE=` to a different provider

### node-cron doesn't trigger

- Ensure the process is still running (check Task Manager for `node.exe`).
- The cron runs in the same Node.js process — if it's killed, scheduling stops.
- Use Task Scheduler's "Triggers" to ensure it restarts automatically.

### "UNSPLASH_KEY is not configured"

Open `.env` and add your key:
```
UNSPLASH_KEY=your_actual_key_here
```

### Wallpaper path errors on Windows

The `wallpaper` npm package handles Windows paths automatically. Ensure the `cache/` directory exists (it is created automatically on first run).

### Running as a background task with no window

In Task Scheduler's **General** tab:
- Select **Run whether user is logged on or not**

This hides the terminal window entirely.

---

## Resetting History

To force the app to start picking wallpapers from scratch:

```bash
# Delete the history file
del cache\history.json
```

The file will be recreated automatically on the next run.

---

## Debug Mode

Enable verbose error stack traces:

```env
DEBUG=true
```

---

## License

MIT – free for personal use.
