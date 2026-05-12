# TableManager Pilot Readiness Assessment

Assessment date: 2026-05-11  
Assessment type: operational pilot readiness, not code-quality review

## Executive Verdict

TableManager is **pitchable for a lightweight pilot**, but it should be positioned as a controlled operational trial rather than a fully proven revenue system. The product has the core pieces needed to test the seat-hour hypothesis: active games, forming games, demand counts, waitlist lifecycle, overflow prompts, seat-hour metrics, and a post-night summary. The main remaining risk is not feature absence; it is whether floor staff can keep the data current during a real busy night without friction.

Pilot readiness score: **84 / 100**

Classification: **Pitchable but needs refinement**

Best pilot framing: “Use this for 3-5 nights to see whether better visibility into demand, waitlists, and second-table formation improves occupied seat-hours and waitlist conversion.”

## Section 1 - Core Pilot Readiness Criteria

| Criterion | Status | Notes |
| --- | --- | --- |
| Identify games close to forming | Pass | Forming Games panel shows viability, seats needed, likely participants, and start/failed actions. |
| Reduce waitlist and overflow uncertainty | Pass | Waitlist, demand counts, staff scripts, and recommended actions support clearer player responses. |
| Improve visibility into active demand | Pass | Dashboard exposes current tables, forming games, waitlist, and KPIs without dense analytics. |
| Make coordination easier/faster | Mostly pass | Quick Add and direct lifecycle buttons help; real-room speed still needs live validation. |
| Measure seat-hour movement | Pass | Tracks occupied seat-hours, wait time, conversion, starts, failed starts, breaks, and sessions. |
| Usable during busy floor environment | Needs validation | UI is simplified, but Friday-night stress has not been proven with real staff. |
| Avoid invasive/exploitative framing | Pass | Product language avoids skill labels, profitability, and player ranking. |

## Section 2 - Operational Reality Test

### Question A - Can a floor official understand the app in under 2 minutes?

Score: **8 / 10**

Notes: The five-panel dashboard is aligned with floor use: Current Tables, Forming Games, KPIs, Waitlist, and Quick Add. The workflow is understandable without explaining analytics. The main risk is that some secondary actions live in other routes, so staff need a short orientation.

Needed fixes:

- Run a 10-minute usability test with a floor official.
- Confirm the labels `Forming Games`, `Waitlist`, and `Quick Add` match how staff naturally talk.
- Consider a one-screen demo seed state that immediately shows a full 1/2 table plus second-table demand.

### Question B - Can staff log interest in under 10 seconds?

Score: **9 / 10**

Notes: Quick Add supports player name, game/stakes, status, and note from the dashboard. This should satisfy incoming calls and walk-ins quickly.

Needed fixes:

- Add keyboard focus defaults if live testing shows mouse use is too slow.
- Consider one-click status presets for the most common cases: `Coming`, `Arrived`, `Interested`.

### Question C - Can staff confidently answer: “Is another game likely to start?”

Score: **8 / 10**

Notes: The app shows viability, seats needed, in-room counts, confirmed-coming counts, wait pressure, and overflow actions. This is enough to support better answers than “table is full.” The caveat is that viability depends on staff keeping statuses current.

Needed fixes:

- Validate viability thresholds against actual room behavior.
- Make sure “Likely to Start” appears only when staff would culturally agree with that phrasing.

## Section 3 - Revenue Alignment Test

### Question D - Does the app directly support increased occupied seat-hours?

Score: **8 / 10**

Notes: The app directly targets the wedge: forming more games, reducing dead time, converting overflow, and measuring seat-hours. It does not yet prove revenue lift; it gives the room a practical way to test it.

Needed fixes:

- Track baseline nights before the pilot.
- Compare pilot nights against baseline using occupied seat-hours, second-table starts, and waitlist conversion.

### Question E - Does the app help reduce player drop-off from uncertainty?

Score: **8 / 10**

Notes: Staff scripts and demand visibility allow answers like “second table likely” and “we have 4 interested.” This can plausibly reduce player hesitation. The exact impact depends on whether staff actually use those scripts or language.

Needed fixes:

- Test scripts with staff and owner before live use.
- Add 2-3 room-specific script variants after observing how staff speak on calls/texts.

### Question F - Does the app create measurable operational improvement?

Score: **9 / 10**

Notes: The app tracks occupied seat-hours, wait time, game starts, failed starts, table breaks, session duration, conversion, and post-night summaries. This is strong enough for a pilot.

Needed fixes:

- Make sure staff close sessions and mark left/no-show outcomes consistently.
- Use a simple nightly checklist before relying on summary metrics.

## Section 4 - Floor Workflow Test

### Question G - Can the app survive a busy Friday night?

Score: **7 / 10**

Notes: The app has the necessary workflows, but this is the least proven area. A busy night with calls, arrivals, overflow, table breaks, and corrections could expose friction. The UI is intentionally simplified, which helps, but real staff behavior needs testing.

Needed fixes:

- Run mock-night simulations before the first live pilot.
- Simulate 3 calls, 2 walk-ins, 1 full table, 1 second-table start, 1 no-show, and 1 table break.
- Watch for whether staff abandon the app when the floor gets busy.

### Question H - Are lifecycle states complete enough?

Score: **8 / 10**

Notes: The app supports `Interested`, `Confirmed Coming`, `Arrived`, `Seated`, `Declined`, `No-Show`, `Left Before Seated`, and `Removed`, plus seated-player left tracking. The only semantic gap is that `Waiting` is represented by `Arrived` rather than a separate state.

Needed fixes:

- Decide whether to add an explicit `Waiting` status or keep `Arrived` as “in-room waiting.”
- In the pilot instructions, define status usage clearly so metrics are consistent.

## Section 5 - Product Positioning Test

### Question I - Does the product feel operational instead of exploitative?

Score: **10 / 10**

Notes: The product consistently uses operational language: game viability, waitlist visibility, table fit, coordination, and occupied seat-hours. It avoids skill profiling, player profitability, and exploitative labels.

Needed fixes:

- Keep reviewing any future recommendation language before adding it.

### Question J - Would a room owner trust this enough to pilot it?

Score: **8 / 10**

Notes: The owner story is clear: improve visibility, convert overflow, reduce uncertainty, and measure seat-hours. The app is practical enough to pitch. The trust risk is data durability and staff compliance, not product direction.

Needed fixes:

- Explain that this is a lightweight pilot, not a full room operating system.
- Show the owner summary first, then the floor workflow.
- Avoid overpromising revenue lift.

## Section 6 - Demo Readiness Test

### Question K - Can you demonstrate value in under 5 minutes?

Score: **8 / 10**

Notes: The app can demonstrate the required flow: log interest, show overflow, detect second-table viability, seat players, track sessions, and show post-night metrics. The demo should be scripted with seed data so the aha moment appears quickly.

Needed fixes:

- Prepare one exact demo scenario and rehearse it.
- Start with a full 1/2 table and 4-5 waiting/interested players.
- End on the post-night summary showing seat-hours and conversion.

## Section 7 - Critical Pilot Blockers

| Blocker | Status | Assessment |
| --- | --- | --- |
| Reliable waitlist lifecycle | Pass | Core statuses and timestamps exist. Clarify `Arrived` vs `Waiting` before pilot. |
| Clean post-night summary | Pass | Summary includes occupied seat-hours, starts, failed starts, waits, conversion, breaks, and export. |
| Clear forming-game visibility | Pass | Dedicated Forming Games panel exists with viability and likely participants. |
| Slow workflows | Not currently blocking | Quick Add and direct lifecycle buttons are present; needs live stress validation. |

No hard blocker is currently severe enough to stop a controlled pilot.

## Section 8 - Revenue Plausibility Assessment

The product plausibly improves nightly revenue if staff use it consistently because it focuses on the revenue-connected behaviors: more active seats, less wait uncertainty, faster second-table coordination, fewer failed starts, and better visibility into fragile games.

The revenue lift is not guaranteed. The highest-risk assumption is that staff will keep statuses accurate during real operations. If staff only partially use the app, the owner summary will become less reliable and the coordination benefit will drop.

Revenue plausibility: **medium-high for a lightweight pilot**

Best measurable hypothesis:

> Nights using TableManager should show higher occupied seat-hours and better waitlist conversion than baseline nights with similar demand.

## Section 9 - Tomorrow Pilot Pitch Readiness Score

| Area | Score |
| --- | ---: |
| Dashboard Clarity | 8 |
| Waitlist Workflow | 8 |
| Forming Games Visibility | 9 |
| Overflow Coordination | 8 |
| Session Tracking | 8 |
| Seat-Hour Metrics | 9 |
| Floor Speed | 7 |
| Trust/Positioning | 10 |
| Demo Readiness | 8 |
| Revenue Alignment | 9 |

Total Score: **84 / 100**

Classification: **Pitchable but needs refinement**

## Section 10 - Final Question

Would a floor official genuinely use this on a busy night because it makes their job easier and helps games run more consistently?

Answer: **Probably yes for a controlled pilot, but not yet proven.**

The product is operationally useful enough to place in front of a real room, especially if the first pilot is framed as a guided test with one or two trained users. The app has the right wedge: live demand, waitlist clarity, second-table formation, and seat-hour measurement. The next proof point is behavioral, not technical: whether floor staff keep it updated when the room gets busy.

## Recommended Pre-Pilot Fixes

1. Run one mock Friday-night simulation.
2. Decide whether to add a separate `Waiting` status or document that `Arrived` means in-room waiting.
3. Prepare a 5-minute demo with seeded overflow demand.
4. Print or write a one-page staff usage guide.
5. Define baseline metrics before the pilot starts.

## Pilot Recommendation

Proceed with a **limited pilot**, not a broad rollout.

Recommended pilot shape:

- 3-5 operating nights
- 1 room
- 1-2 trained floor users
- Track baseline vs pilot metrics
- Focus only on 1/2 NLH and one secondary game at first
- Review post-night summaries with the owner after every pilot night

Primary success criteria:

- Higher occupied seat-hours
- Faster second-table starts
- Better waitlist conversion
- Fewer players leaving before seated
- Staff report that answering calls/texts became easier
