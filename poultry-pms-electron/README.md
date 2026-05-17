# Agri-ERP Desktop

Electron desktop wrapper for the **Agri-ERP** farm management platform.

## Development

```bash
npm install
npm run dev        # Opens Electron pointing to http://localhost:3000
```

> Make sure the Next.js web app is running on port 3000 first:
> ```bash
> cd ../   # root of poultry-pms
> npm run dev
> ```

## Production Build (Windows)

```bash
npm install
npm run build      # Outputs NSIS installer to ./dist
```

## Architecture

| File | Purpose |
|------|---------|
| `main.js` | Main Electron process — window management, tray, menu, auto-updater |
| `preload.js` | Secure bridge between renderer (web page) and main process |
| `assets/icon.ico` | Windows app icon (replace with your actual icon) |
| `assets/tray-icon.png` | System tray icon (16×16 or 32×32 PNG) |

## Configuring the URL

In `main.js`, update `PROD_URL` to your live Vercel deployment:

```js
const PROD_URL = 'https://pms-host-v1-ab.vercel.app';
```

## Icons

Place your icon files in the `assets/` folder:
- `icon.ico` — Windows `.ico` format (256×256 recommended)
- `tray-icon.png` — 16×16 or 32×32 PNG for the system tray

You can convert your existing logo using https://convertio.co/png-ico/
