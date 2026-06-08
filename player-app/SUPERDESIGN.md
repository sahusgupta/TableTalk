# TableTalk Player Design Philosophy

TableTalk Player is designed as a calm, mobile-first companion for poker players who want to find games, understand club activity, manage memberships, and join waitlists without feeling like they are using a casino dashboard. The visual language should feel clear, local, and trustworthy: closer to a premium coordination tool than a betting product.

The app should communicate three things at a glance:

- Where good game opportunities are.
- Whether the player has a relationship with the club.
- What action is available now.

The interface favors practical discovery over spectacle. Screens should be dense enough to scan quickly, but never cramped. Cards, map regions, status pills, and bottom navigation should make the app feel touch-native and operational, with every visual decision serving orientation, confidence, or action.

## Core Principles

### Calm Utility

The player app should reduce uncertainty. It uses soft surfaces, clear hierarchy, and restrained status color so players can compare clubs, games, seats, distance, and waitlist state quickly. Avoid casino cliches, dark gambling-room aesthetics, neon, aggressive reds, and anything that implies exploitative play.

### Local Presence

Maps, distance language, club cards, and home-radius context are central to the product. The design should make the player feel anchored in a real local poker ecosystem rather than browsing an abstract feed.

### Trust Before Excitement

The player is sharing identity, location preferences, memberships, and waitlist intent. Onboarding, account settings, and sync states should feel polished and secure. Use sturdy typography, generous spacing, and high-contrast actions to convey reliability.

### Actionable Discovery

Every game card should answer: what game is running, where it is, how close it is, whether seats are open, and how to join. Visual hierarchy should privilege game name, seat/waitlist state, distance, and the primary action.

### Friendly Native Touch

The app uses rounded cards, pill buttons, animated press feedback, bottom tabs, and icon-led controls. Interactions should feel soft and responsive, with compact tap targets and clear active states.

## Core Color Scheme

The player app uses a light, cool palette built around navy, teal, white glass surfaces, and selective warm accents.

| Role | Color | Use |
| --- | --- | --- |
| Ink | `#102033` | Primary text, active tab text, important labels. |
| Muted | `#667085` | Secondary text, supporting details, placeholders. |
| Canvas | `#edf2f7` | Base screen background. |
| Panel | `#fbfdff` | Solid card and account surfaces. |
| Line | `#d8e1ea` | Borders, input outlines, dividers. |
| Primary | `#17324f` | Main actions, home/club pins, hero surfaces. |
| Primary Dark | `#10233a` | Deep text accents, shadows, progress fills. |
| Primary Soft | `#e7eef8` | Soft buttons, badges, avatars, sync panels. |
| Teal | `#0f766e` | Positive/active states, joined clubs, progress, eyebrow labels. |
| Teal Soft | `#dff4ef` | Active tabs, preference bands, open/available states. |
| Amber | `#b56a18` | Selected map pins and attention states. |
| Amber Soft | `#fff0da` | Pending/waitlist/status pill backgrounds. |
| Coral | `#c2413d` | Destructive or warning accents, used sparingly. |

## Backgrounds

The app should remain light by default. Main screens use a subtle gradient:

```text
#f8fbff -> #eef7f3 -> #e7eef8
```

Onboarding uses a slightly brighter version:

```text
#f9fbff -> #eef7f3 -> #f2f5fb
```

These gradients should stay quiet. They are atmospheric support for white panels and navy/teal accents, not the visual centerpiece.

## Surface Language

Most app content lives on translucent white panels:

- Search panels: `rgba(255,255,255,0.82)`
- Club cards: `rgba(255,255,255,0.88)`
- Game cards: `rgba(255,255,255,0.9)`
- Onboarding step surfaces: `rgba(255,255,255,0.96)`
- Inputs and chips: `rgba(255,255,255,0.92)`

Borders are usually soft white or `#d8e1ea`. Shadows are navy-tinted with low opacity, creating elevation without heaviness. Rounded corners are generous on mobile: 18-30px for cards and panels, 999px for pills.

## Typography

The app uses system-native sans-serif typography with a strong weight scale. Headings and key metrics are heavy and compact; supporting text is smaller, muted, and still fairly bold for readability on mobile.

- Screen titles are large, dark, and heavy.
- Eyebrows are teal, uppercase, and concise.
- Card titles are bold and direct.
- Status and pill text uses high font weight to remain legible at small sizes.
- Letter spacing should remain `0`; the current style depends on weight and color, not tracking.

## Interaction Color Rules

Primary actions use a navy-to-teal gradient:

```text
#17324f -> #23645d
```

Disabled actions shift to slate:

```text
#94a3b8 -> #7f8ea3
```

Active selections usually use soft teal backgrounds with dark navy text. Pending or waitlist states use soft amber. Warning/destructive cues may use coral, but should not dominate the screen.

## Components

### Game Cards

Game cards are the core discovery unit. They should be white, rounded, and lightly elevated. Use value pills for distance, seats, waitlist, joined status, and preferred-game context. The primary button should be visually dominant and anchored near the bottom of the card.

### Club Cards

Club cards should read as quick comparison rows: club identity, distance or membership state, and an immediate affordance. Selected cards use a cool purple-blue border accent (`#9ba8ee`) but should still live inside the broader navy/teal system.

### Map UI

Maps should feel integrated into the app, not embedded as a generic widget. Use rounded map containers, soft radius rings, navy home pins, teal joined-club pins, and amber selected pins.

### Onboarding

Onboarding should feel guided and trustworthy. The hero uses a deeper gradient:

```text
#10233a -> #1e5f57 -> #edf8f4
```

The step surface is a soft white card below it. Keep copy short and action-oriented. The progress bar uses navy, reinforcing the sense of steady setup rather than marketing flourish.

### Bottom Tabs

The bottom tab bar should remain a translucent white pill anchored above the safe area. Active tabs use `#dff4ef`; inactive labels use muted gray. Icons should be familiar and simple.

## Voice And Product Feel

Language should emphasize coordination, visibility, game formation, wait reduction, occupied seat-hours, likely participation, and table fit. Avoid predatory poker terms or player-quality labels. The player app should never imply that users are hunting weaker players; it is helping them find legitimate games and manage participation.

## Design Guardrails

- Keep the app light, clean, and practical.
- Use navy for authority, teal for healthy activity, amber for attention, and coral only for caution.
- Do not introduce neon, casino red/black, heavy gold, or felt-table green as dominant themes.
- Preserve rounded native controls and compact, scannable cards.
- Make maps and local distance context prominent whenever discovery is involved.
- Keep primary actions obvious and touch-friendly.
- Favor trust, clarity, and coordination over hype.
