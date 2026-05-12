# TableManager Branding Control Sheet

Use `branding.config.json` as the central editable branding file. The React app reads it for the visible product name, tagline, pilot report name, and color theme. Electron reads it for native window titles and background color.

Most brand changes should start here:

```json
{
  "product": {
    "name": "TableManager",
    "tagline": "Operational coordination",
    "description": "Desktop poker room coordination system for game formation, waitlists, and occupied seat-hour tracking.",
    "pilotReportName": "TableManager Pilot Report"
  },
  "desktop": {
    "appId": "com.tablemanager.desktop",
    "productName": "TableManager",
    "author": "TableManager",
    "backgroundColor": "#f5f2ec"
  }
}
```

After editing `branding.config.json`, run:

```powershell
npm run build
npm run desktop
```

## Brand Identity

| Element | Current Value | Where To Edit |
| --- | --- | --- |
| Product name | `TableManager` | `branding.config.json` `product.name` |
| Eyebrow / category label | `Operational coordination` | `branding.config.json` `product.tagline` |
| App description | Desktop coordination description | `branding.config.json` `product.description` |
| Pilot report name | `TableManager Pilot Report` | `branding.config.json` `product.pilotReportName` |
| Electron window titles | Route-specific titles | `branding.config.json` `desktop.windowTitles` |
| Electron background color | `#f5f2ec` | `branding.config.json` `desktop.backgroundColor` |
| Packaged app name | `TableManager` | `package.json` `build.productName`; mirror in `branding.config.json` |
| Electron app ID | `com.tablemanager.desktop` | `package.json` `build.appId`; mirror in `branding.config.json` |

## Exact Text Locations

### Main Dashboard Header

Config source: `branding.config.json`

```json
"product": {
  "name": "TableManager",
  "tagline": "Operational coordination"
}
```

Change these if you want to test names like:

- `TableManager`
- `SeatFlow`
- `RoomFlow`
- `TableOps`
- `GameFlow`

### Window Titles

Config source: `branding.config.json`

```json
"windowTitles": {
  "floor": "TableManager",
  "builder": "Build a Table",
  "profiles": "Profiles",
  "signals": "Interest Signals",
  "summary": "Owner Summary",
  "pilot": "Pilot Readiness"
}
```

These control the native Electron window titles.

### HTML Title

The runtime document title is set from `branding.config.json` `product.name`. `index.html` still has a fallback title for the first static load.

### Package / Installer Identity

File: `package.json`

Look for:

```json
"name": "table-manager",
"description": "Desktop poker room coordination system for game formation, waitlists, and occupied seat-hour tracking.",
"author": "TableManager",
"appId": "com.tablemanager.desktop",
"productName": "TableManager"
```

Change `productName` for the packaged desktop app name. Change `appId` only once you settle on a final brand, because it affects installed-app identity.

Important: Electron Builder reads package identity from `package.json`, not from runtime app code. Keep `package.json` and `branding.config.json` mirrored for `appId`, `productName`, and `author`.

## Color System

Primary visual branding is controlled by CSS variables at the top of `src/styles.css`.

### Default Theme

Config source: `branding.config.json`

```json
"theme": {
  "default": {
    "ink": "#172033",
    "muted": "#667085",
    "canvas": "#eef3fb",
    "primary": "#3346a8",
    "primaryDark": "#25347c"
  }
}
```

### Low-Light Theme

Config source: `branding.config.json`

```json
"theme": {
  "lowLight": {
    "ink": "#e7ecf8",
    "canvas": "#101727",
    "primary": "#8ea2ff"
  }
}
```

## Recommended Professional Palette Experiments

### Current Direction: Professional Indigo

Good for a polished SaaS/operations feel.

```css
--primary: #3346a8;
--primary-dark: #25347c;
--primary-soft: #e8ecff;
--teal: #0f766e;
--amber: #b86b16;
--rose: #a33a3a;
```

### Slate + Blue

More neutral and executive.

```css
--ink: #182230;
--muted: #667085;
--canvas: #f1f5f9;
--primary: #2563eb;
--primary-dark: #1e3a8a;
--primary-soft: #dbeafe;
--teal: #0f766e;
--amber: #b45309;
--rose: #b42318;
```

### Charcoal + Emerald

More operational and floor-room focused.

```css
--ink: #1f2933;
--muted: #697586;
--canvas: #eef2f3;
--primary: #0f766e;
--primary-dark: #115e59;
--primary-soft: #ccfbf1;
--teal: #2563eb;
--amber: #b86b16;
--rose: #a33a3a;
```

## Typography

Config source: `branding.config.json` `theme.fontFamily`

Current font stack is stored as a single string in `theme.fontFamily`.

Good alternatives:

- Keep current stack for a native desktop feel.
- Use `"Inter"` first if you later bundle the font.
- Use `"Segoe UI"` first for a Windows-native look.

## Background And Surface Style

Config source: `branding.config.json` theme background fields.

The background is driven by:

```json
"backgroundStart": "#f7f9fe",
"backgroundAccentPrimary": "rgba(51, 70, 168, 0.11)",
"backgroundAccentSecondary": "rgba(15, 118, 110, 0.09)"
```

For a more minimal professional look, make both accent colors transparent and use a neutral `backgroundStart`.

## Buttons And Controls

File: `src/styles.css`

The strongest branded elements are:

- `.primary-button`
- `.ghost-button`
- `.secondary-button`
- `.health-pill`
- `.status-chip`

Most of these rely on the CSS variables above, especially:

- `--primary`
- `--primary-dark`
- `--primary-soft`
- `--line`
- `--panel`

Change the variables first before editing individual button classes.

## Icons

File: `src/main.tsx`

Icons come from `lucide-react`. The dashboard currently uses icons such as:

- `LayoutDashboard`
- `Users`
- `Clock`
- `Target`
- `Plus`
- `MessageCircle`
- `Download`
- `Save`
- `Edit3`

To change icons, update the imports at the top of `src/main.tsx` and the JSX where buttons or panel titles are rendered.

## Brand Language Rules

Config source: `branding.config.json` `language`.

Keep product language operational:

- Use `coordination`
- Use `visibility`
- Use `game formation`
- Use `wait reduction`
- Use `occupied seat-hours`
- Use `likely participant`
- Use `table fit`

Avoid:

- skill labels
- profitability language
- exploitability language
- player ranking language
- automation-heavy claims

## Fast Brand Editing Checklist

1. Edit `branding.config.json`.
2. If changing packaged app identity, mirror `desktop.productName`, `desktop.appId`, and `desktop.author` into `package.json`.
3. Run `npm run build`.
4. Run `npm run desktop` to visually check the result.

## Future Improvement

If you want package metadata to be generated from `branding.config.json`, add a small prebuild script that syncs `package.json` from the config before packaging.
