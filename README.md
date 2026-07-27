# Cricket Scorecard Overlay

A professional, lightweight, and responsive cricket scorecard overlay designed for live streaming (OBS, Streamlabs, vMix, etc.). It fetches real-time match data from the **CricClubs** API or runs in debug mode with mock data.

## Features

- **Real-Time Updates**: Polls the API every 5 seconds for live scores.
- **18 Visual Themes**: Orange (default), Modern, Classic, Neon, IPL team themes (KKR, RCB, MI, CSK, DC, RR, SRH, PBKS, GT, LSG), and Topguns themes.
- **Dynamic Scaling** (`?dynamic=1`): Automatically scales the scoreboard to fit the viewport width (95%) while capping height at 25%, ensuring it works at 1920×1080, 1280×720, or any resolution. Overflow protection and compact ball indicators (14px) are injected alongside the scale transform.
- **Streamlabs Mode** (`?sl=1`): Compact layout that hides team logos, reduces fonts and spacing for restricted browser-source canvases. Implicitly enables dynamic scaling.
- **Chase Info Integration**: When the second innings chase bar appears, its content (opposing score + "NEED X FROM Y OVERS Z RRR") is rendered inline within the main bar as a 3-line block, eliminating a second row.
- **Self-Hosted Fonts**: Montserrat is bundled for consistent rendering across all devices without external requests.
- **Performance Optimized**: Zero layout shifts (CLS), minimal network footprint, and bundled CSS.
- **Built with Vite + TypeScript**: Fast dev server, type-safe code, modern bundling.
- **Automated Deployment**: GitHub Actions builds and deploys to GitHub Pages on push.

> **Credits**: This project is inspired by and builds upon the work of [abhinav91690](https://github.com/abhinav91690/cricket-scorecard-overlay). The original implementation provided the foundation for the CricClubs API integration, scoreboard layout, and core overlay mechanics.

---

## Quick Start

### 1. Install & Run Locally
```bash
npm install
npm run dev
```
The dev server starts at `http://localhost:5173`.

### 2. Add to OBS / Streamlabs
1. Add a **Browser Source**.
2. Set the URL to your local server or deployed GitHub Pages URL.
3. Width: `1920`, Height: `1080` (or your canvas size).
4. Append query parameters (see below).

### 3. Setup Page
Open the page in a browser — the setup panel gives you:
- Match ID and Club ID fields
- USACricketJunior (`40319`) preselected by default
- 18 theme buttons (Orange is default)
- Dynamic Scaling and Streamlabs Mode checkboxes (both checked by default)
- Live URL preview with Open and Copy buttons

---

## Configuration (URL Parameters)

| Parameter | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `matchId` | **Yes** for overlay | — | Unique Match ID from CricClubs |
| `clubId` | No | `40319` (USACricketJunior) | CricClubs club ID |
| `theme` | No | `orange` | Visual theme name (18 available, see below) |
| `dynamic` | No | — | `1` enables dynamic scaling |
| `sl` | No | — | `1` enables Streamlabs mode (compact layout, hides logos, auto-enables dynamic scaling) |
| `debug` | No | — | Use mock data instead of live API (see Debug Modes) |
| `mode` | No | — | `replay` cycles through sample data |
| `logo` | No | — | `1` or `2` to show a sponsor logo |

### Example URLs
```
# Full overlay with defaults
?matchId=9243&clubId=40319&dynamic=1&sl=1&theme=orange

# Compact Streamlabs mode
?matchId=9243&sl=1

# Classic theme with debug data
?debug=1&theme=classic
```

### Themes
All 18 themes: `orange`, `classic`, `modern`, `neon`, `kkr`, `rcb`, `mi`, `csk`, `dc`, `rr`, `srh`, `pbks`, `gt`, `lsg`, `tel`, `ted`, `tul`, `tud`.

### Debug Modes
Test layouts without a live match:
- `?debug=1` — 1st Innings (Standard)
- `?debug=2` — 2nd Innings (Chasing)
- `?debug=3` — Match Ended
- `?debug=4` — Pre-match / Toss
- `?debug=5` — No Team Logos

---

## Development

```bash
npm run test        # Run unit tests (vitest)
npm run build       # Type-check, test, and build for production (outputs to /dist)
npm run preview     # Preview the production build locally
```

## Deployment

A GitHub Actions workflow is included (`.github/workflows/deploy.yml`). Push to `main` to trigger an automatic build and deploy to GitHub Pages.

---

## Architecture

See [architecture.md](./architecture.md) for a detailed breakdown of the project structure, data flow, theming system, and component design.
