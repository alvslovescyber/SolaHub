# UI bug report — manual code-level crawl

This is the static equivalent of the planned Playwright crawl. The crawler
script lives at `e2e/crawl.spec.ts` and can be run locally with
`npx playwright test e2e/crawl.spec.ts`; in this sandbox Chrome cannot be
launched.

## Severity legend
- **P0** — broken functionality (button/widget does nothing or errors)
- **P1** — clearly wrong behaviour or copy/visual that the user explicitly called out
- **P2** — polish

| ID | Severity | Page | Issue | Fix |
|----|----------|------|-------|-----|
| B-01 | P0 | Dashboard | "Open Bible" topbar button had no `@click` and no `RouterLink` wrapper | Wrapped in `<RouterLink :to="{ name: 'bible' }">` |
| B-02 | P0 | Dashboard | Setup-guide "Continue" button had no handler | Made each setup card a `<RouterLink>` to a real route (`settings` / `plans` / `community`) |
| B-03 | P0 | Dashboard | "Watch intro" / "Documentation" / "Release notes" / "Community Discord" links were `href="#"` | Wired to real `https://solahub.app/...` URLs with `target="_blank" rel="noopener"` |
| B-04 | P0 | Dashboard | Tasks/Activity/Reports tabs swapped state but rendered identical content | Replaced with `home / reading / activity` tabs; each filters the page sections via `v-if="tab === ..."` |
| B-05 | P0 | Settings | "Change avatar" button had no handler | Wired to a hidden `<input type="file">`; toast on selection |
| B-06 | P0 | Settings | "Cancel" button on profile form had no handler | Wired to `resetProfile()` (restores initial values) |
| B-07 | P0 | Settings | Password change form had three inputs but **no submit button** | Wrapped in a `<form @submit.prevent>`; added validation, loading state, friendly toast |
| B-08 | P0 | Topbar (every page) | Notifications bell did nothing | Wrapped in `SDropdownMenu` with an empty-state notifications panel |
| B-09 | P0 | Calendar | "Back to Dashboard" / "New event" buttons had no handlers | Both wired (`router.push` and toast respectively) |
| B-10 | P0 | Community | "New post" button had no handler | Wired to `useSToast().info(...)` with "coming soon" copy |
| B-11 | P1 | Inbox / Calendar / Community | Tab switching didn't change the empty-state copy | Added `tabCopy` computed driven by tab id |
| B-12 | P1 | Inbox | Subtitle still read "Mentions, shared annotations, and community pings" (CRM-y) | Replaced with "Shared notes, prayer requests, and church updates" |
| B-13 | P1 | Inbox | "Filter" topbar button was decorative only | Removed (was misleading; will return when filtering ships) |
| B-14 | P1 | Plans | Subtitle still read "Read Scripture together with your community" | Updated to "Walk through Scripture, on your own or with your church" |
| B-15 | P1 | Settings → Profile | Description said "your community" not "your church family" | Updated copy |
| B-16 | P1 | Sidebar (every page) | Sidebar 240 px — too wide vs Kinabase reference (~210 px); group labels too large; item rows too tall | New tokens: `--s-sidebar-width: 212px`; rows now `28px` tall, `13px` text, `15px` icons; group labels `10px` `tracking-[0.08em]` |
| B-17 | P1 | Sidebar | Sidebar group label "Live" too generic for a Bible hub | Renamed to "Sunday" |
| B-18 | P1 | Sidebar | Active item used a heavy gradient + inset shadow ring | Switched to a Kinabase-style soft blue tint (`rgba(59, 107, 255, 0.08)`) + brand text and brand-tinted icon |
| B-19 | P1 | Sidebar / canvas | Aurora gradients (peach / rose / violet at full saturation) bled through everywhere — the user explicitly asked for less colour | Lowered all aurora alphas (~0.55 → 0.18); kept only a single subtle peach radial in sidebar; removed the multi-radial overlay everywhere else |
| B-20 | P1 | Tabs (every page) | Active tab was bold-grey with a tiny grey indicator — Kinabase active tab is **blue text + blue underline** | Active tab is now `text-brand-600 font-semibold`, indicator is `2px bg-brand-500`; counts on active tab also tint blue |
| B-21 | P1 | Auth screens | Login background was a heavy 4-radial rainbow | Reduced to a soft 2-radial peach + mint over neutral; matches Kinabase restraint |
| B-22 | P1 | Dashboard | Stat cards (Notes/Active plans/Drafts) had three different rainbow gradient backgrounds | Now neutral cards (`bg-surface-base`) with a single brand-tinted icon chip |
| B-23 | P1 | Dashboard | Setup cards were rainbow-tiled (rose, blue, emerald) | Now plain white cards with a brand-tinted index chip and a brand "Continue →" link, hovers to brand border |
| B-24 | P1 | Dashboard right-rail | "Help & resources" hero card had a triple-gradient + blurred orb | Replaced with a clean bordered card |
| B-25 | P2 | Topbar bell | Bell rendered even on Settings (`show-bell="false"` was respected, but icon-only bell elsewhere had a stale tooltip) | Now opens a dropdown with a real notifications shell — same component everywhere |

## Bugs deferred (need backend support, not a UI bug)
- **D-1** — Password change endpoint isn't implemented in API yet. The form now validates and shows a friendly "queued" message instead of silently doing nothing; once the endpoint ships we can swap the toast for a real `auth.changePassword(...)` call.
- **D-2** — Avatar upload requires a multipart endpoint that isn't there yet. The file input now validates the selection and toasts; the actual upload is a one-line addition once the endpoint exists.

## How to reproduce the live crawl
```bash
# requires backend on :5000 OR works web-only with the spec's /api stubs
npx playwright test e2e/crawl.spec.ts --reporter=list

# output:
cat e2e-report/crawl-report.json | jq '.[] | {route, deadButtons, consoleErrors}'
```
