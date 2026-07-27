# System Architecture — Cricket Scorecard Overlay

The Cricket Scorecard Overlay is a client-side TypeScript web application built with Vite. It fetches live match data from the CricClubs API and renders a customizable scoreboard overlay for live broadcasting. All rendering happens in the browser — there is no backend server.

---

## Project Structure

```
cricket-scorecard-overlay/
├── .github/workflows/
│   └── deploy.yml              # GitHub Actions: build + deploy to Pages
├── assets/images/
│   ├── PulteHomes.png          # Sponsor logo (logo=1)
│   └── PerryHomes.png          # Sponsor logo (logo=2)
├── src/
│   ├── css/
│   │   ├── instructions.css    # Instructions screen + Streamlabs (body.prov-sl) overrides
│   │   ├── theme-orange.css    # Orange theme (default)
│   │   ├── theme-classic.css   # Classic broadcast theme
│   │   ├── theme-modern.css    # Modern glassmorphism theme
│   │   ├── theme-neon.css      # Neon glow theme
│   │   ├── theme-kkr.css       # Kolkata Knight Riders
│   │   ├── theme-rcb.css       # Royal Challengers Bangalore
│   │   ├── theme-mi.css        # Mumbai Indians
│   │   ├── theme-csk.css       # Chennai Super Kings
│   │   ├── theme-dc.css        # Delhi Capitals
│   │   ├── theme-rr.css        # Rajasthan Royals
│   │   ├── theme-srh.css       # Sunrisers Hyderabad
│   │   ├── theme-pbks.css      # Punjab Kings
│   │   ├── theme-gt.css        # Gujarat Titans
│   │   ├── theme-lsg.css       # Lucknow Super Giants
│   │   ├── theme-tel.css       # Topguns Elite Light
│   │   ├── theme-ted.css       # Topguns Elite Dark
│   │   ├── theme-tul.css       # Topguns United Light
│   │   └── theme-tud.css       # Topguns United Dark
│   ├── api.ts                  # CricClubs API fetch wrapper
│   ├── config.ts               # Global constants (refresh rate, default club ID, logo map)
│   ├── dom.ts                  # Typed DOM element references (singleton)
│   ├── mockData.ts             # Static mock match states for debug mode
│   ├── replayData.ts           # Sequential match states for replay mode
│   ├── script.ts               # Main entry: update loop, dynamic scaling, Streamlabs handler
│   ├── theme.ts                # Theme registration, applyTheme(), updateLogo()
│   ├── types.ts                # TypeScript interfaces (Player, CricketAPIData, Config, etc.)
│   ├── ui.ts                   # DOM rendering: logos, scoreboard, ball-by-ball
│   ├── utils.ts                # Utilities: query param parser, image loader, ball style mapper
│   ├── utils.test.ts           # Unit tests for utils.ts
│   └── ui.test.ts              # Unit tests for ui.ts
├── index.html                  # Entry point: setup panel + overlay DOM
├── vite.config.ts              # Vite configuration (base: './', test: jsdom)
├── tsconfig.json               # TypeScript strict config
├── package.json                # Dependencies and scripts
└── feature-ideas.md            # Feature suggestions based on unused API data
```

---

## Core Components

### 1. Entry Point — `index.html`

The page operates in two modes:

**Setup Panel** (default, when no `?matchId=` is present):
- Match ID text input
- Club ID radio buttons (USACricketJunior `40319` checked by default) + custom text input
- 18 theme buttons (Orange active by default)
- Dynamic Scaling + Streamlabs Mode checkboxes (both checked)
- Live URL preview + Open / Copy buttons
- A `<script>` block handles all setup UI logic inline (theme selection, radio sync, URL generation, clipboard copy, overlay detection)

**Overlay Mode** (when `?matchId=` is present):
- The overlay DOM is rendered: `#overlay-image` (sponsor), `#result` (match result), `#firstInnings` (main scoreboard), `#secondInnings` (chase info)
- `src/script.ts` is loaded as an ES module and drives the update loop

### 2. Update Loop — `src/script.ts`

The main entry module. `updateScore()` is called immediately and then every `CONFIG.REFRESH_RATE` (5000 ms).

**Flow:**
1. Parse URL params via `getQueryParams()`
2. If no `matchId`/`debug`/`replay`, show instructions overlay and exit
3. Apply theme (`applyTheme`) and sponsor logo (`updateLogo`)
4. Call `handleStreamlabs()` (adds `body.prov-sl` if `sl=1`; initializes dynamic scaling if `dynamic` or `sl`)
5. Determine data source:
   - `mode=replay` → cycle `sampleReplayData[]`
   - `debug` set → select from 6 mock states (`mock_toss`, `mock_1stInnings`, `mock_2ndInnings`, `mock_matchEnded`, `mock_noTeamImage`)
   - else → `fetchScoreData()` from CricClubs API
6. `updateTeamLogos(data)` → cache and set team logo images
7. `updateScoreboard(data)` → render all text content and ball indicators
8. Dynamic scaling's MutationObserver detects DOM changes and re-measures automatically

### 3. Data Polling — `src/api.ts`

A single `fetchScoreData(apiUrl)` function that fetches JSON from the CricClubs live score endpoint:
```
https://cricclubs.com/liveScoreOverlayData.do?clubId={clubId}&matchId={matchId}
```
Returns a parsed `CricketAPIData` object. Throws on non-OK responses (caught in `updateScore()`).

### 4. State Management & DOM Rendering — `src/ui.ts`

**`updateScoreboard(data)`:**
- Reads `values.isSecondInningsStarted` to determine innings phase
- Sets batsman 1 & 2 names (striker gets `*` suffix), runs/balls
- Sets bowler name, wickets-runs, overs
- Renders the current batting team's score/overs/wickets in the scorecard pill
- In second innings: shows chasing team's score, etc. (via `#secondInnings`) and the `showMsgForScoreNeeded` HTML
- In match ended: shows `result` overlay
- Calls `updateBallByBall()` to render ball indicators

**`updateBallByBall(balls, overs)`:**
- Compares current balls array to previous via JSON stringify (skip if unchanged)
- Clears and rebuilds `#ball-by-ball` container with `.ball-indicator` divs
- Each ball gets a CSS class from `getBallStyleClass()` for color-coded rendering
- Fills remaining balls in the over with empty indicators

**Helper functions:**
- `setText()` — updates `textContent` only on change (avoids unnecessary DOM writes)
- `setDisplay()` — updates `style.display` only on change
- `setVisible()` — toggles `.is-visible` class for visibility+opacity transitions

### 5. Typed DOM References — `src/dom.ts`

Exports a `DOM` constant mapping all overlay element IDs to typed references (`HTMLDivElement`, `HTMLImageElement`, `HTMLSpanElement`). Used by `ui.ts` and `script.ts` to avoid repeated `document.getElementById()` calls.

### 6. Configuration — `src/config.ts`

```typescript
export const CONFIG = {
    REFRESH_RATE: 5000,
    DEFAULT_CLUB_ID: '40319',  // USACricketJunior
    LOGO_MAP: { '1': '...PulteHomes.png', '2': '...PerryHomes.png' }
};
```

### 7. Types — `src/types.ts`

Full TypeScript interfaces for the CricClubs API response (~150+ fields), including:
- `Player`, `BattingStats`, `BowlingStats`, `PartnershipData`
- `CricketAPIValues` (match data, team stats, player stats, scoring messages)
- `CricketAPIData` (top-level response wrapper)
- `Config` (application configuration shape)

---

## Theming System

Themes use **CSS custom properties** scoped to a body class (e.g., `.theme-orange`). Each theme file declares ~35 variables that control every visual aspect:

| Category | Variables | Example |
| :--- | :--- | :--- |
| Brand | `--brand-primary`, `--brand-secondary`, `--brand-accent` | `#0066ff`, `#ff851b`, `#ffcc00` |
| Gradients | `--gradient-team-a`, `--gradient-team-b`, `--gradient-chase` | `linear-gradient(135deg, #0033cc, #0066ff)` |
| Text | `--text-primary`, `--text-secondary`, `--text-light`, `--text-white` | `#ffffff`, `#e2e8f0` |
| Background | `--bg-transparent`, `--bg-glass` | `transparent`, `rgba(17,24,39,0.65)` |
| Ball colors | `--ball-default`, `--ball-run`, `--ball-four`, `--ball-six`, `--ball-wicket`, `--ball-wide`, `--ball-noball`, `--ball-extra` | Various |
| Effects | `--shadow-soft`, `--shadow-card`, `--blur-amount`, `--border-glass` | `0 8px 32px rgba(0,0,0,0.3)`, `12px` |
| Radius | `--radius-large`, `--radius-pill` | `14px`, `50px` |

**Registration** (`src/theme.ts`):
1. All 18 CSS files are imported as side-effect imports (Vite bundles them)
2. `AVAILABLE_THEMES` constant lists valid theme names
3. `applyTheme(theme)` removes all previous `theme-*` classes and adds the selected one (defaults to `theme-orange`)

**Theme families:**
- **Bloom-style** (orange, modern, neon) — rounded corners (14–16px), gaps between sections, glassmorphism backgrounds
- **IPL-style** (kkr, rcb, mi, csk, dc, rr, srh, pbks, gt, lsg) — sharp corners (6px), no gaps, gold accent borders, gradient-glass background
- **Classic** — monospace-adjacent font, circular team info containers, gray gradients
- **Topguns** (tel, ted, tul, tud) — similar to IPL style, silver/gray palettes with blue or red accents

---

## Dynamic Scaling

Enabled when `?dynamic=1` or `?sl=1` is present. Located in `src/script.ts`, `injectDynamicScale()`.

**Purpose:** Scale the scoreboard to fit the viewport at any resolution (95% width, capped at 25% height) without manual adjustment.

**How it works:**

1. **Wrapper creation:** A `<div id="scaling-wrapper">` is injected into `.overlay`. The `#result`, `#firstInnings`, and `#secondInnings` elements are reparented inside it.
2. **Measurement:** `wrapper.scrollWidth` and `wrapper.scrollHeight` are measured to determine the content's natural size.
3. **Scale calculation:**
   ```
   scale = Math.min(viewportWidth * 0.95 / contentWidth,
                    viewportHeight * 0.25 / contentHeight,
                    1)
   ```
4. **Application:** A dynamic `<style>` element (`#dynamic-scale-rule`) is injected with `#scaling-wrapper { transform: scale(N) }`.
5. **Overflow protection CSS:** A second `<style>` element (`#dynamic-scale-base`) is injected with rules that prevent text overlap and ensure content fits within the scaled wrapper:
   - `#scaling-wrapper .score-overlay { overflow: hidden; }` — clips child overflow at the bar boundary
   - `#scaling-wrapper .batsman-name, .batsman-runs-balls, .bowler-name, .bowler-figures, .team-name { overflow: hidden; max-width: 100%; }` — constrains text elements to their flex container without ellipsis truncation (clean clip)
   - `#scaling-wrapper .ball-by-ball-container { display: flex; gap: 3px; }` — compact ball layout
   - `#scaling-wrapper .ball-by-ball-container .ball-indicator { width: 14px; height: 14px; font-size: 7px; border-radius: 50%; }` — reduced to 14px so a full over (6+ extras) always fits without clipping
6. **Reactivity:** A `MutationObserver` on `#firstInnings` triggers debounced (50ms) re-measurement when content changes. A `resize` listener also triggers debounced (80ms) re-measurement. Initial measurement via `requestAnimationFrame`.

6. **Chase info merge:** When second innings is active, the chase content is rendered as a 3-line block inside `#firstInnings` and the separate `#secondInnings` row is hidden, halving the overlay height.

---

## Streamlabs Mode

Enabled when `?sl=1` is present. `handleStreamlabs()` adds `class="prov-sl"` to `<body>`.

**CSS overrides** (in `src/css/instructions.css`):
- Hides `.batting-team-info` and `.bowling-team-info` (team logos removed)
- Reduces fonts: player names 14px, stats 12px, team name/score 15px, overs 11px
- Compacts spacing: scorecard pill padding 4px/14px, score-overlay padding 0/8px, ball indicators 18×18px
- Match result and second innings fonts/padding reduced

Streamlabs mode **implicitly enables dynamic scaling** (even without `?dynamic=1`).

---

## Chase Info Integration

Located inside `injectDynamicScale()`, `syncChaseInfo()` merges the second innings chase bar into the main scoreboard bar as a 3-line block:

| Line | Class | Content | Style |
| :--- | :--- | :--- | :--- |
| 1 | `.chase-team-line` | `LA Avengers 133/10 28.5` | Bold 13px, `#ff851b` (deep orange) |
| 2 | `.chase-need-line` | `North Central Knights NEED 84` | 12px, `--brand-accent` (gold) |
| 3 | `.chase-need-detail` | `FROM 17.0 OVERS 4.94 RRR` | 11px, `--text-secondary` |

- Triggered when `#secondInnings` gains `.is-visible` and `#score-needed` has content
- The `score-needed` text is parsed at the ` FROM ` delimiter to split lines 2 and 3
- A `MutationObserver` watches `#secondInnings` class changes, `#score-needed` content, and team/score element text
- When inactive, chase-info is hidden and `#secondInnings` is restored

---

## Data Flow Diagram

```
URL Query Params
       │
       ▼
getQueryParams()  ───────────────► config.ts (defaults)
       │
       ▼
  ┌── updateScore()  ◄────────── setInterval(5000ms)
  │       │
  │       ├── applyTheme(theme)
  │       ├── updateLogo(logo)
  │       ├── handleStreamlabs() ──► body.prov-sl + injectDynamicScale()
  │       │
  │       ├── mode=replay  ──► sampleReplayData[]
  │       ├── debug=1..5   ──► mockData.ts
  │       └── else ──► fetchScoreData(apiUrl)
  │                         │
  │                         ▼
  │                   CricketAPIData (JSON)
  │       │
  │       ▼
  │   updateTeamLogos(data)  ──► cache + set logo img.src
  │   updateScoreboard(data)
  │       │
  │       ├── setText() batsman/bowler info
  │       ├── setVisible() innings sections
  │       ├── updateBallByBall() ──► ball indicators
  │       └── DOM updated ──► MutationObserver fires
  │                                    │
  │                                    ▼
  │                              applyScale() re-measures
  │                              #scaling-wrapper transform
  │
  └──► Repeat...
```

---

## URL Parameters Reference

| Parameter | Source | Used By | Effect |
| :--- | :--- | :--- | :--- |
| `matchId` | `utils.ts` → `getQueryParams()` | `script.ts` → `updateScore()` | Triggers overlay mode; used in API URL |
| `clubId` | `utils.ts` → `getQueryParams()` | `script.ts` → `updateScore()` | Club ID for API URL; defaults to `40319` |
| `theme` | `utils.ts` → `getQueryParams()` | `theme.ts` → `applyTheme()` | Selects CSS theme; defaults to `orange` |
| `dynamic` | `utils.ts` → `getQueryParams()` | `script.ts` → `handleStreamlabs()` | Enables `injectDynamicScale()` |
| `sl` | `utils.ts` → `getQueryParams()` | `script.ts` → `handleStreamlabs()` | Adds `body.prov-sl` + dynamic scaling |
| `debug` | `utils.ts` → `getQueryParams()` | `script.ts` → `updateScore()` | Selects mock data (`1`–`5`) |
| `mode` | `utils.ts` → `getQueryParams()` | `script.ts` → `updateScore()` | `replay` cycles sample data |
| `logo` | `utils.ts` → `getQueryParams()` | `theme.ts` → `updateLogo()` | Shows sponsor image (`1` or `2`) |

---

## Testing

Unit tests use **Vitest** with `jsdom` environment.

- `src/utils.test.ts` — Tests `getBallStyleClass()` mappings and `getQueryParams()` parsing (12 tests)
- `src/ui.test.ts` — Tests `updateScoreboard()` rendering and instructions screen visibility (6 tests)

Run: `npm run test` (watch) or `npm run test:run` (single run, also part of `npm run build`)

---

## Build & Deployment

1. **TypeScript check** (`tsc --noEmit`)
2. **Tests** (`vitest run`)
3. **Vite build** (`vite build`) — outputs to `dist/` with relative base path (`./`)

**GitHub Actions** (`.github/workflows/deploy.yml`):
- Trigger: push to `main`
- Installs dependencies, runs tests, builds, uploads `dist/` as Pages artifact, deploys
- Uses modern Pages deployment (artifact-based, no `gh-pages` branch)

---

## External Dependencies

- **@fontsource/montserrat** (v5.2.8) — Self-hosted Montserrat font files (400, 600, 700 weights)
- **CricClubs API** — Primary data source: `https://cricclubs.com/liveScoreOverlayData.do`
- **Vite** — Build tool and dev server
- **TypeScript** — Language
- **Vitest** — Test runner
