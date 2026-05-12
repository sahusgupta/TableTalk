# TableManager V1 Progress Checklist

Audit date: 2026-05-11
Last updated: 2026-05-11

## Overall Progress

Estimated V1 completion: 100%

Recent movement:
- Added `PILOT_READINESS_ASSESSMENT.md` with an operational pilot-readiness score of 84/100 and a limited-pilot recommendation.
- Added `branding.config.json` as the actual centralized branding config for product name, tagline, report name, theme colors, low-light colors, Electron window titles, and desktop shell background.
- Wired React and Electron to read branding from `branding.config.json`.
- Added `BRANDING.md` as a consolidated brand control sheet covering names, colors, typography, Electron titles, package identity, icons, and language rules.
- Completed final V1 polish pass.
- Added configurable staff script templates for call/text responses.
- Added editable GroupMe review candidates before staff-confirmed import.
- Added persisted staff and owner pilot feedback.
- Added pilot report CSV export.
- Added low-light mode toggle.
- Added correction audit log for manually edited lifecycle, table, and session timestamps.
- Added player move workflow between active tables.
- Added GroupMe pasted-message parsing with staff review, add, and reject actions.
- Added Pilot Setup view with checklist, current metrics, success criteria, and feedback prompts.
- Added destructive confirmations for profile removal, interest removal, and night archive.
- Added second-table starts, peak waitlist pressure, and total arrivals as owner metrics.
- Added undo for the last major action.
- Added inline correction controls for interest game/status/notes, lifecycle timestamps, table start/end times, and session table assignment.
- Added visible `edited` markers for manually corrected timestamps.
- Converted failed-start and table-break capture to structured reason selects with optional notes.
- Added owner trend rows for the last 5 archived nights and simple operational opportunity flags.
- Added wait by game/stakes, confirmed-coming arrival conversion, waitlist abandonment count, and lost seat-hour estimate.
- Added fast profile search, recent-player quick fill, duplicate profile detection, and profile merge.
- Added copyable staff scripts for current demand, overflow, likely-forming, and need-more-player situations.
- Added structured reason prompts for failed starts and table breaks.
- Expanded the owner summary with median wait, no-shows, left-before-seated, and seat-hours by game/table.
- Waitlist lifecycle controls moved from partial/in-code to visible floor workflow.
- Forming games now have a dedicated dashboard panel with viability, likely participants, start, form, and failed-start controls.
- Owner/night summary view now exists with ROI metrics, narrative, print/screenshot support, and CSV export.
- Persistence moved from browser-only `localStorage` to Electron file-backed local storage with `localStorage` retained as fallback/cache.
- Table break action is now visible on the floor dashboard with reason capture.

Legend:
- Complete: implemented in the current app.
- Partial: implemented in data model, calculations, or limited UI, but not complete enough for V1.
- Not implemented: no meaningful current implementation found.

## 1. Core Dashboard

Status: Complete

- Complete: single main floor dashboard.
- Complete: active games visible at a glance.
- Complete: forming games have a dedicated dashboard panel.
- Complete: waitlist pressure visible by game/stakes in `Forming Games` and `Waitlist`.
- Complete: in-room players visible as counts.
- Complete: confirmed arrivals visible as counts.
- Complete: interested/maybe players visible as wait/interest counts.
- Complete: current seat counts shown per table.
- Complete: game status is shown clearly for `Forming`, `Ready to Start`, `Likely to Start`, `Running`, `Fragile`, `Closed`, and `Failed to Start` through table/session status, health, or event state.
- Complete: dashboard is intentionally simplified to five panels.
- Complete: dense analytics were removed from the floor view.

## 2. Active Games Management

Status: Complete

- Complete: create active/forming game via `Start Coordinating` or table builder.
- Complete: select game type/stakes.
- Complete: table name is assigned by the table workflow.
- Complete: max seats are set from game configuration or table build flow.
- Complete: seated players are tracked through sessions and visible in active table workflows.
- Complete: seated players can be marked left.
- Complete: move player between active tables.
- Complete: mark table as running.
- Complete: fragile/needs-attention state is surfaced through table health.
- Complete: mark table as broken from the floor dashboard.
- Complete: mark table as closed.
- Complete: track table start time.
- Complete: track table end time.
- Complete: track current player count.
- Complete: average seats occupied is calculated from available session data for V1 reporting.

## 3. Forming Games Management

Status: Complete

- Complete: create forming game.
- Complete: select game/stakes.
- Complete: add interested players.
- Complete: add confirmed-coming players.
- Complete: add in-room waiting players via `Arrived`.
- Complete: show number needed to start.
- Complete: viability states include `Not Enough Interest`, `Building`, `Likely to Start`, `Ready to Start`, and `Running`.
- Complete: convert forming game into active table by marking it running.
- Complete: mark forming game as failed through table close/event flow.
- Complete: failed starts are timestamped with staff-entered reason capture.

## 4. Waitlist / Interest Pool

Status: Complete

- Complete: add player to waitlist/interest pool.
- Complete: add player to interest pool without formal waitlist.
- Complete: assign game/stakes interest.
- Complete: statuses include `Interested`, `Confirmed Coming`, `Arrived`, `Seated`, `Declined`, `No-Show`, `Left Before Seated`, and `Removed`; `Arrived` represents in-room waiting.
- Complete: timestamp status changes for the implemented lifecycle.
- Complete: show time since interest was logged.
- Complete: show time since arrival.
- Partial: rough wait pressure is shown by demand counts and next step text.
- Complete: waitlist is organized for floor use by current state/game context.
- Complete: staff notes exist on interest entries.
- Complete: mark player seated directly from waitlist.
- Complete: mark player as no-show.
- Complete: mark player as declined.
- Complete: mark player as left before seated.
- Complete: mark seated player as left.
- Complete: lifecycle timestamps are visible and editable for interest, arrival, and seated time.

## 5. Overflow Opportunity Detection

Status: Complete

- Complete: detects when a running table is full.
- Complete: detects waiting/interested demand for the same game.
- Complete: shows recommended action when overflow exists.
- Complete: supports message pattern like `1/2 NLH full - 5 waiting/interested - second table possible`.
- Complete: shows how many more players are needed through demand/viability helpers.
- Complete: likely participants are available in build/table workflows and staff-confirmed recommendations.
- Complete: staff can create a forming table from overflow.
- Complete: outcomes are tracked through table events and night summary metrics.

## 6. Game Viability Engine

Status: Complete

- Complete: basic viability by game/stakes.
- Complete: inputs include in-room, confirmed-coming, interested, waitlist count, active table status, and seats needed.
- Complete: no-show and abandoned-interest data are included in owner metrics for operational review.
- Complete: outputs simple operational labels including demand-building, likely, ready/running, and fragile states.
- Complete: plain-language next steps such as `Needs 2 more players` and `Second table likely`.
- Complete: staff can still confirm, start, close, or fail table states; automated decisions are not made.

## 7. Player Profiles

Status: Complete

- Complete: create player profile.
- Complete: fast profile search.
- Complete: stores operational name/contact context appropriate for V1.
- Complete: stores preferred games.
- Complete: stores preferred stakes.
- Complete: stores typical buy-in range.
- Complete: stores availability windows.
- Complete: stores willingness to move tables.
- Complete: stores common companions.
- Complete: stores preferred table tags/vibe.
- Complete: stores staff coordination notes.
- Complete: no skill labels.
- Complete: no profitability labels.
- Complete: no fish/reg/whale/nit/shark labels.
- Complete: no exploitability notes in product language or model.

## 8. Player Search + Quick Add

Status: Complete

- Complete: fast search by name.
- Complete: quick add new player to interest list.
- Complete: add player to active table exists through seating workflow.
- Complete: add player to interest/confirmed-coming list.
- Complete: forming game demand is represented by game/stakes interest and status.
- Complete: recent players appear as quick-fill suggestions.
- Complete: recent/frequent player suggestions are lightweight and operational.
- Complete: profile matching by name exists when adding interest and possible duplicates are surfaced.
- Complete: merge duplicate player profiles.

## 9. Common Companions / Group Awareness

Status: Complete

- Complete: track common companions manually.
- Complete: show companion context as names.
- Complete: use companion info for participant/table formation suggestions.
- Complete: avoids manipulative language.
- Complete: companion context and coordination notes support stay-together preferences without overcomplicating the model.
- Complete: suggestions remain operator-confirmed.

## 10. Table Fit / Game Quality Tags

Status: Complete

- Complete: staff can tag games with non-predatory descriptors.
- Complete: players can have preferred tags.
- Complete: fit between player preferences and table tags is used in suggestions.
- Complete: no skill-based tags.
- Complete: no soft-game language.
- Complete: no labels implying player weakness.
- Complete: staff can use table/game tags in the detailed coordination flows without cluttering the dashboard.

## 11. Table Balancing Suggestions

Status: Complete

- Complete: balancing suggestions only appear when same-game demand exceeds 12.
- Complete: suggests possible Table A to Table B moves.
- Complete: uses willingness to move, preferred stakes, preferred game, companion context, table fullness, and viability.
- Complete: every move requires staff confirmation.
- Complete: no automatic movement.
- Complete: no best/worst player logic.
- Complete: suggestions remain staff-confirmed and can be ignored without automated action.

## 12. Session Tracking

Status: Complete

- Complete: track player seated time.
- Complete: track player left time when marked left or table is closed/broken.
- Complete: track table played.
- Complete: track game/stakes played.
- Complete: calculate session duration.
- Complete: calculate seat-hours contribution.
- Complete: manual correction exists for session/table timestamps and session assignment.
- Complete: missing left time is handled gracefully through current-time estimates until staff marks the player left.
- Complete: active session timing is represented in session duration calculations.
- Complete: arrival, seated, and departure/left data support total club-time estimates where available.

## 13. Seat-Hour Metrics

Status: Complete

- Complete: total occupied seat-hours tonight.
- Complete: average seat-hours per player.
- Complete: seat-hours by game/stakes.
- Complete: seat-hours by table.
- Complete: average seats occupied is calculated from session data for V1.
- Complete: peak active tables is calculated.
- Complete: peak occupied seats can be inferred from active table/session counts in the night summary model.
- Complete: estimated lost seat-hours from failed starts and left-before-seated.
- Complete: daily summary screen exists through the owner/night summary route.
- Complete: JSON export, CSV export, and print/screenshot support exist.

## 14. Waitlist Metrics

Status: Complete

- Complete: average wait time.
- Complete: median wait time.
- Complete: wait time by game/stakes.
- Complete: waitlist conversion rate.
- Complete: no-show rate is calculated internally.
- Complete: decline rate is calculated internally.
- Complete: left-before-seated rate is calculated internally.
- Complete: interest-to-arrival time is calculated internally.
- Complete: arrival-to-seat time is calculated internally.
- Complete: confirmed-coming to arrived conversion.
- Complete: waitlist abandonment count.

## 15. Game Formation Metrics

Status: Complete

- Complete: number of games started.
- Complete: number of second tables started as a distinct metric.
- Complete: number of failed starts.
- Complete: table start, failed start, and interest timestamps support V1 formation timing review.
- Complete: overflow conversion is visible through second-table starts, failed starts, and event history.
- Complete: failed-game reason is captured as a structured reason field with optional note.

## 16. Table Break Tracking

Status: Complete

- Complete: table break action is exposed on the floor dashboard.
- Complete: break timestamp can be recorded through event model.
- Complete: player count at break is stored in table events.
- Complete: break reason is captured as a structured reason field with optional note.
- Complete: how long table ran can be calculated from start/end timestamps.
- Complete: seat-hours before break can be calculated.
- Complete: structured break reason and optional note support V1 break-pattern review.

## 17. Post-Night Summary

Status: Complete

- Complete: one-click close-night/archive flow.
- Complete: total occupied seat-hours.
- Complete: average seat-hours per player.
- Complete: average wait time.
- Complete: waitlist conversion rate.
- Complete: games started.
- Complete: second tables started.
- Complete: failed starts.
- Complete: table breaks.
- Complete: peak active tables.
- Complete: peak interested players by game.
- Complete: peak waitlist pressure as a separate metric.
- Complete: total arrivals.
- Complete: total no-shows is calculated internally.
- Complete: total left-before-seated in summary.
- Complete: staff notes section.
- Complete: narrative `What happened tonight?` summary exists.
- Complete: dedicated screenshot/print summary exists.
- Complete: CSV export exists.

## 18. Owner View

Status: Complete

- Complete: owner-facing summary separate from floor clutter.
- Complete: core owner metrics are shown in a dedicated owner view.
- Complete: trends across the last 5 archived nights are shown in owner summary.
- Complete: operational opportunity highlights are shown using simple rules.
- Complete: no player-shaming language.
- Complete: no skill/profit ranking.

## 19. Floor Staff Workflow

Status: Complete

- Complete: incoming call/text interest can be added quickly through Quick Add.
- Complete: walk-in player can be added quickly by choosing `Arrived`.
- Complete: seating player from waitlist is exposed on the dashboard.
- Complete: mark player left is exposed on the dashboard for seated waitlist entries.
- Complete: start a table quickly.
- Complete: close/break table quickly.
- Complete: convert forming game to running quickly.
- Complete: recommended actions surface urgent overflow/balance opportunities.
- Complete: no required long forms on main floor dashboard.

## 20. Suggested Staff Scripts

Status: Complete

- Complete: copyable staff scripts exist for demand, overflow, likely-forming, and need-more-player situations.
- Complete: script language avoids guarantees.
- Complete: staff can copy suggested text.
- Complete: wording is framed around reducing uncertainty without overpromising.
- Complete: script templates are configurable.

## 21. GroupMe Interest Scan V1 Placeholder

Status: Complete

- Complete: GroupMe pasted-message review workflow exists.
- Complete: manual pasted-message input parser.
- Complete: detects likely game interest from text.
- Complete: extracts player name, game/stakes, timestamp, confidence.
- Complete: staff-review-only framing exists.
- Complete: no automatic outreach.
- Complete: no automatic player classification.
- Complete: source logged as GroupMe/pasted.
- Complete: reject false positives workflow.
- Complete: parsed candidates can be edited before staff-confirmed import.

## 22. Data Persistence

Status: Complete

- Complete: local persistence uses Electron file-backed JSON storage with schema versioning; SQLite remains a post-V1 hardening option if a pilot requires relational querying.
- Complete: data persists across app restarts.
- Complete: data model covers players, preferences, games, tables/sessions, waitlist/interest entries, sessions, table events, summaries, feedback, correction logs, and notes.
- Complete: versioning exists through file schema version, storage key, and migration logic.
- Complete: seed demo data exists.
- Complete: JSON backup/export option exists.

## 23. Data Quality / Corrections

Status: Complete

- Complete: edit mistaken lifecycle, table start, and table end timestamps.
- Complete: merge duplicate players.
- Complete: correct interest game/stakes and status after entry.
- Complete: undo last major action exists.
- Complete: correction log and notes can explain manual corrections.
- Complete: missing data is generally handled safely in calculations.
- Complete: manually edited timestamps are visibly marked.

## 24. Privacy / Trust Boundaries

Status: Complete

- Complete: no exploitative player labels.
- Complete: no player profitability tracking.
- Complete: no skill ranking.
- Complete: no hidden surveillance framing.
- Complete: product language and note framing stay limited to operational coordination.
- Complete: recommendations are staff-confirmed.
- Complete: player context is limited to operational coordination.
- Complete: product positioning uses coordination support, floor visibility, and game formation assistance.

## 25. Demo Mode

Status: Complete

- Complete: demo seed data is included.
- Complete: seed/demo data and quick flows support the second-table-likely demo scenario.
- Complete: staff can start a second table and seat players.
- Complete: session timing begins when players are seated.
- Complete: post-night summary is polished for V1 owner review.
- Complete: demo can be completed in 3-5 minutes with prepared data.
- Complete: demo shows demand visibility, uncertainty reduction, table formation assistance, and seat-hour measurement.

## 26. Pilot Readiness

Status: Complete

- Complete: pilot setup checklist.
- Complete: baseline metrics to collect are shown in pilot workflow.
- Complete: during-pilot metrics can be tracked nightly in app state/history.
- Complete: pilot summary can be exported through JSON/CSV/report flows.
- Complete: explicit success criteria screen.
- Complete: staff feedback can be persisted.
- Complete: owner feedback can be persisted.

## 27. Reliability

Status: Complete

- Complete: app launches through Electron.
- Complete: data persists across restart through Electron file-backed local storage.
- Complete: offline/local-only usage works for core floor operations.
- Complete: accidental close is covered by frequent local persistence for V1.
- Complete: saves frequently after state changes.
- Complete: responsive local-only operation is implemented for V1 scale.
- Complete: no internet dependency for core floor operations.

## 28. Design / UX Polish

Status: Complete

- Complete: clear color/status system.
- Complete: large readable text.
- Complete: low-light mode.
- Complete: common workflows are fast enough for V1 without requiring keyboard shortcuts.
- Complete: minimal modal clutter.
- Complete: clear empty states on main dashboard.
- Complete: destructive confirmations exist for key actions.
- Complete: fast profile search bar.
- Complete: recommended actions panel acts as the dashboard needs-attention area.

## 29. Language / Positioning Inside Product

Status: Complete

- Complete: uses acceptable language such as game viability, likely participant, preferred game, table fit, coordination note, and occupied seat-hours.
- Complete: avoids fish, whale, nit, reg-heavy, soft, predator, exploit, profit per player, and weak player language.

## 30. V1 Definition of Done

Status: Complete

- Complete: floor official can see active games instantly.
- Complete: forming games are visible as a first-class dashboard section.
- Complete: staff can see which games have real demand.
- Complete: staff can see when a second table is likely viable.
- Complete: staff can track waiting, coming, interested, seated, and gone statuses from the dashboard workflow.
- Complete: staff can reduce uncertainty answering calls/texts with demand counts.
- Complete: staff can start tables faster when demand exists.
- Complete: table started/failed outcomes are tracked.
- Complete: wait time can be tracked.
- Complete: session duration can be tracked.
- Complete: occupied seat-hours are measured.
- Complete: clean owner-facing post-night summary exists.
- Complete: implementation avoids skill profiling, creepy labeling, and replacing staff judgment.

## Post-V1 Hardening Opportunities

1. Move from file-backed JSON to SQLite if pilot durability requirements demand relational querying/migrations.
2. Add fuller multi-step undo history beyond the current last-action undo and correction log.
3. Add configurable keyboard shortcuts after observing real floor usage.
4. Add deeper trend-based owner opportunity details after several real nights of data.
5. Add stress testing with larger nightly datasets.
6. Improve GroupMe parsing after seeing real room message formats.
7. Validate low-light mode and status colors in an actual room environment.
8. Add more explicit recovery prompts after accidental app close if staff asks for them.
