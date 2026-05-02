# SolaHub — Full Code Audit Report

**Audit date:** 2026-05-02  
**Scope:** Frontend (Vue 3.5 + TypeScript), Backend (.NET 10 C# Clean Architecture), Auth, DB, Tests  
**Auditor:** Automated code review + Playwright functional testing

---

## Executive Summary

SolaHub is a well-structured Christian digital ecosystem app built on a solid foundation (Clean Architecture, CQRS, Result<T> pattern, strongly-typed IDs). The architecture shows deliberate design decisions and the component system is consistent. However, several critical gaps exist between the planned feature set and the shipped implementation:

1. **Three core features are stub implementations** (profile save, password change, avatar upload).
2. **Reading plans' "Add Day" is broken** due to a verse ref format mismatch between frontend and backend.
3. **Three entire pages are placeholders** (Community, Calendar, Inbox).
4. **Security improvements** are needed (localStorage tokens, no CSP, user enumeration).
5. **Test coverage** is thin — integration tests exist but unit test coverage of domain logic is minimal.

---

## 1. Architecture Assessment

### Strengths

**Clean Architecture layers are correctly enforced**  
`Core → Application → Infrastructure → API` with dependency direction respected. Domain entities don't reference EF Core or ASP.NET types.

**CQRS with MediatR is well applied**  
Commands and queries are separated with marker interfaces `ICommand<T>` / `IQuery<T>`. Handlers are focused and single-responsibility.

**Result<T> monad prevents exception-driven control flow**  
Domain errors are explicit values (e.g. `Error.Unauthorized(...)`, `Error.NotFound(...)`). API controllers use `Match()` to map domain results to HTTP status codes cleanly.

**Strongly-typed IDs prevent primitive obsession**  
`UserId`, `ChurchId`, `VerseNoteId`, `ReadingPlanId` are record structs — no raw Guid being passed around where the wrong ID type could be silently accepted.

**Frontend Pinia stores are lean composition-API stores**  
Each store has clear state, computed properties, and actions. Cache invalidation (TTL-based) is implemented correctly in `notes.store.ts`.

### Weaknesses

**No cross-layer validation contract**  
The backend validates command inputs (FluentValidation), but the frontend sends requests with no pre-validation of verse ref format, plan day constraints, etc. This leads to 422s that surface as opaque errors to the user.

**Shared kernel / domain error codes not typed on the frontend**  
Error codes like `Notes.ContentTooLong`, `Plans.NoDays` are string constants in the backend but arrive as untyped `AxiosError`. The frontend cannot make decisions based on specific error codes — it can only show generic messages.

**Missing anti-corruption layer for Bible ref format**  
`BOOK.CHAPTER.VERSE` is a domain invariant, but nothing on the frontend enforces it. Both the Notes create dialog and the Plan Add Day dialog accept freeform or book-only refs, then discover the format problem only at the API.

---

## 2. Critical Issues

### C-01 — Verse Ref Format Contract Broken (Frontend ↔ Backend)

**Location:** `src/views/PlanDetailView.vue:115`, backend `ReadingPlanDay`  
**Detail:**  
The Add Day passage picker builds refs as `` `${pickerBook}.${pickerChapter}` `` (e.g. `JHN.3`). The backend's `VerseRef` value object requires full `BOOK.CHAPTER.VERSE` format.

**Fix options:**
1. Change the backend to accept chapter-level refs (e.g. `JHN.3.*`) as a range concept — this is the semantically correct approach for "read a whole chapter."
2. Add a verse range to the UI picker and send `JHN.3.1-JHN.3.36` style refs (complex).
3. Canonicalize on the frontend to `JHN.3.1` (first verse only) as a stand-in — a quick hotfix but semantically wrong.

Option 1 is recommended: introduce a `ChapterRef` concept (`BOOK.CHAPTER`) and update the `ReadingPlanDay` entity to support it.

---

### C-02 — Profile / Password / Avatar Endpoints Not Implemented

**Location:** `src/views/SettingsView.vue:49-56`, `73-100`, `157-159`  
**Detail:**  
Three settings operations are stub implementations displaying fake success feedback. This is extremely high risk because users believe their changes are saved.

**Required:**
- `PUT /api/users/me` — update display name  
- `POST /api/users/me/avatar` — multipart upload  
- `PUT /api/users/me/password` — current + new password change

---

### C-03 — `canvasTextStyle` / `canvasRefStyle` Undefined in PresenterView

**Location:** `src/views/PresenterView.vue:634`, `:643`  
**Detail:**  
Both computed refs are referenced in the slide preview template but never declared in `<script setup>`. Vue treats them as `undefined` and applies no `style` attribute. The preview canvas renders text at the browser's default font size, so the preview does not match the actual presentation output.

**Fix:** Declare `canvasTextStyle` and `canvasRefStyle` as computed properties reading from `biblePrefs.presenterFontScale`, analogous to `biblePrefs.presenterVerseFontSize` used in the fullscreen overlay.

---

## 3. Security Assessment

### SEC-01 — Access Token + Refresh Token in localStorage (HIGH)

**Location:** `src/stores/auth.store.ts` / HTTP client  
**Risk:** Any XSS vulnerability (stored or reflected) can read `localStorage` and exfiltrate both tokens, achieving full account takeover without requiring physical device access.  
**Fix:** Store the refresh token in an `HttpOnly; Secure; SameSite=Strict` cookie managed by the .NET API. The access token can remain in memory (not persisted) and be re-hydrated on page load via a silent refresh.

### SEC-02 — No Content-Security-Policy Header (HIGH)

**Risk:** Without CSP, any injected script has unrestricted access to all browser APIs and storage. Compounds SEC-01.  
**Fix:** Add a strict CSP response header in the .NET `Program.cs` middleware pipeline, e.g.:
```
Content-Security-Policy: default-src 'self'; script-src 'self'; connect-src 'self' ws://localhost:5000 wss://...; img-src 'self' data:; style-src 'self' 'unsafe-inline'
```

### SEC-03 — User Enumeration via Register Endpoint (MEDIUM)

**Location:** Backend `RegisterCommand` handler  
**Detail:** Returns `"An account with email 'X' already exists."` — the submitted email is reflected in the error. Attackers can enumerate all registered emails with a simple script.  
**Fix:** Return a generic `"Registration failed"` message. Optionally implement a time-delay to mask timing differences between existing and new accounts.

### SEC-04 — No Concurrent Refresh Token Mutex on Frontend (MEDIUM)

**Location:** HTTP interceptor in `src/services/http/client.ts`  
**Detail:** If multiple requests fire simultaneously when the access token is expired, all of them independently attempt a refresh. The first succeeds and rotates the token. Subsequent requests arrive with the now-invalidated old token and receive 401, leaving the user partially authenticated.  
**Fix:** Gate refresh calls behind a shared promise — the first caller fetches, subsequent callers await the same promise.

```typescript
let refreshPromise: Promise<void> | null = null

// In interceptor:
if (!refreshPromise) {
  refreshPromise = authStore.refreshToken().finally(() => { refreshPromise = null })
}
await refreshPromise
```

### SEC-05 — Refresh Token Shares JWT Signing Key (LOW)

**Memory note:** The refresh token uses the same `Jwt:SecretKey` HMAC-SHA256 key as access tokens. A compromised signing key allows minting arbitrary tokens of both types.  
**Fix:** Use a separate key for refresh tokens, or better — use opaque refresh tokens stored server-side (current implementation uses rotation which is good, but key sharing weakens the boundary).

---

## 4. Frontend Code Quality

### F-01 — Notes: `update()` Store Action Never Called

`notesService.update()` and `notes.update()` are fully implemented end-to-end but no view ever calls them. The Notes page is create-and-delete only. This is a capability regression — users cannot edit notes.

### F-02 — `useActivityFeed` Composable Returns Empty Feed

`DashboardView.vue` imports and renders `useActivityFeed()`, but the composable produces an empty array. The Activity tab on the Dashboard is permanently empty regardless of user activity. Either the composable has no data source or it was never wired to the notes/plans stores.

### F-03 — `useDisplayMonitors` Is Tauri-Only

`src/composables/useDisplayMonitors.ts` calls a Tauri command to enumerate display monitors. In web mode (`VITE_WEB_ONLY=true`) this fails silently. The Presenter page shows "Detecting monitors…" indefinitely or shows no monitors. The composable needs a web-mode fallback (`[{ name: 'Primary Display', width: window.screen.width, height: window.screen.height }]`).

### F-04 — `songs.store.ts` Has No Backend Integration

The songs store is a pure in-memory Pinia store. Songs are not saved to the database, not synced via SignalR, and not persisted to `localStorage`. The entire worship song library feature is session-only.

### F-05 — STooltip Missing `inheritAttrs: false`

All `STooltip` usages in `SSidebar.vue` pass `data-no-drag` which Vue warns about because the component renders a fragment. The component needs:
```typescript
defineOptions({ inheritAttrs: false })
```
and a manual `v-bind="$attrs"` on the correct inner element.

### F-06 — `window.confirm()` Used for Destructive Actions

`confirmDelete()` in `NotesView.vue:40` and `deletePlan()` / `archivePlan()` in `PlanDetailView.vue` use native `window.confirm()`. This is:
- Blocked in some iframe/sandboxed contexts
- Unstyled and breaks the design system
- Inaccessible (no keyboard focus management)

Replace with an `SConfirmModal` component that matches the design system.

### F-07 — No Optimistic Updates; Store Mutations Block on Network

All store actions await the API before updating local state. For operations like note creation, this means the UI is frozen until the round-trip completes. Implement optimistic updates with rollback on error for better perceived performance.

### F-08 — Route Guard Does Not Handle Token Expiry During Session

The `requiresAuth` meta guard in the router checks `auth.isAuthenticated` synchronously. If the access token expires while the user is on a page, the next navigation attempt may fail silently rather than redirecting to login.

### F-09 — `shallowRef` Used for `notes` Array May Cause Missed Reactivity

`notes.store.ts:9` uses `shallowRef<VerseNote[]>`. Mutations that modify items inside the array (e.g. tag edits) without replacing the array reference will not trigger reactivity. This is fine as long as all mutations replace the array — but it is a subtle footgun. If a future developer mutates `notes.value[i].tags.push(...)` reactivity will silently break.

### F-10 — `plan.participants.find()` May Not Match UUID Formats

`PlanDetailView.vue:57` — `plan.participants.find(p => p.userId === auth.user?.id)`. If the backend returns UUIDs in different case formats (mixed vs lowercase), string equality may fail even for the same user. Normalize to lowercase on both sides.

---

## 5. Backend Code Quality

### B-01 — `ReadingPlanDay._verseRefKeys` as JSONB + Computed `VerseRefs`

**Location:** `ReadingPlanDay` entity  
**Detail:** `_verseRefKeys` is the EF-persisted field; `VerseRefs` is computed from it. `ReadingPlanConfiguration` must `Ignore(d => d.VerseRefs)` to avoid owned-type conflicts. This split is a valid pattern but requires careful migration discipline — any change to the computed property must also verify the JSONB serialization format.

### B-02 — No Rate Limiting on Auth Endpoints

**Location:** `POST /api/auth/login`, `POST /api/auth/register`  
**Risk:** Brute-force attacks on login. No rate limiting, lockout policy, or CAPTCHA is implemented.  
**Fix:** Add `AspNetCoreRateLimit` or ASP.NET Core's built-in rate limiting middleware (`Microsoft.AspNetCore.RateLimiting`) with a sliding window policy on `/api/auth/*`.

### B-03 — `LoginCommand` Timing-Safe Dummy Hash Is Correct but Verify the Implementation

The memory notes mention timing-safe dummy hash verification in `LoginCommand`. Verify that:
1. The dummy hash computation always runs (not short-circuited by early return on user-not-found).
2. The comparison uses a constant-time compare, not string equality.

### B-04 — No Soft-Delete for User Accounts

There is no account deactivation or deletion endpoint. GDPR/CCPA right-to-erasure compliance would require at minimum soft-delete (`IsActive = false` with a scheduled purge job) or hard delete with cascade.

### B-05 — SignalR `CollaborationHub` Has No Authorization Attribute

**Location:** `/hubs/collaboration`  
If `[Authorize]` is not applied to the hub class or hub methods, unauthenticated WebSocket connections could be established. Verify `[Authorize]` is present on the hub and that the JWT bearer scheme is configured to authenticate SignalR connections via query string (`?access_token=...`).

### B-06 — EF Core Migrations May Conflict with net10.0 Tooling

The project targets `net10.0` with `EFCore.NamingConventions 10.0.1` and `Npgsql.EFCore 10.0.1`. If any developer runs `dotnet ef migrations add` on a machine with an older .NET SDK, migrations may be generated with an incompatible metadata format. Pin the `dotnet-ef` tool version in `dotnet-tools.json`.

---

## 6. Performance Assessment

### P-01 — Notes 5-Minute Cache: No Invalidation After Create/Delete

`notes.store.ts:14` sets `lastFetchedAt` after fetch. But `create()` at line 53 also sets `lastFetchedAt = Date.now()`, which is correct. `remove()` at line 79 does NOT update `lastFetchedAt`. If the user navigates away and back within 5 minutes after a deletion, `fetchMyNotes(force=false)` will use the stale cache that still contains the deleted note. However since `notes.value` is updated in memory it won't re-appear; the real risk is the inverse: a note created on another device won't appear until the cache expires.

**Fix:** Call `invalidateCache()` (or set `lastFetchedAt = 0`) on all mutations, or use a socket-push to invalidate.

### P-02 — No Virtual Scrolling for Large Note Lists

The notes list renders all notes in the DOM with `v-for`. Users with hundreds of notes will experience DOM bloat and scroll jank. Implement virtual scrolling (`@tanstack/vue-virtual` or `vue-virtual-scroller`) for the notes list.

### P-03 — Plan Days List Has No Pagination

`PlanDetailView.vue` renders all plan days. A 365-day annual Bible reading plan would render 365 DOM nodes. Add virtual scrolling or pagination with a "Load more" pattern.

### P-04 — `Promise.all([notes.fetchMyNotes(), plans.fetchMyPlans()])` on Dashboard

This is correct parallel fetching. Good. No change needed.

### P-05 — Bible Chapter Load Has Correct AbortController Usage

`loadScriptureChapter()` in `PresenterView.vue:91-128` correctly cancels in-flight requests with an `AbortController`. This is well-implemented.

### P-06 — No Server-Side Caching (Redis Is Optional and Unused)

`ConnectionStrings:Redis` is defined in config but Redis is listed as optional. For verse lookups and reading plan fetches which are read-heavy and rarely mutate, a Redis cache layer would significantly reduce database load at scale.

---

## 7. Testing Assessment

### T-01 — Integration Tests Use Testcontainers Correctly

`ApiFactory.cs` spins up a real PostgreSQL container. This is the right approach — EF Core migrations are applied against a real DB, preventing the mocked-test divergence problem.

### T-02 — Unit Test Coverage of Domain Entities Appears Minimal

From the project structure, `tests/Unit/` exists. Domain entities have complex behavior (e.g. `ReadingPlan.Publish()` failing when no days exist, `User.UpdateRefreshToken()`, `VerseNote.Create()` validation). These should have comprehensive unit tests. If coverage is below 80% on `Core` layer entities, add tests.

### T-03 — No Frontend Unit Tests

There are no `*.spec.ts` or `*.test.ts` files in `src/`. The Playwright e2e tests exist in `e2e/` but there are no component-level tests with Vitest + Vue Test Utils. Critical composables (`useActivityFeed`, `usePresenterScale`) and stores should have unit tests.

### T-04 — Playwright E2E Tests Are Not Wired to CI

The `.github/workflows/frontend.yml` runs linting and type-checking but does not invoke the Playwright test suite. Without e2e in CI, regressions ship silently.  
**Fix:** Add a Playwright step to `frontend.yml`:
```yaml
- run: npx playwright install --with-deps
- run: npx playwright test
```

---

## 8. Best Practices Checklist

| # | Check | Status |
|---|-------|--------|
| BP-01 | Clean Architecture layers respected | ✅ |
| BP-02 | CQRS commands/queries separated | ✅ |
| BP-03 | Domain errors as values (Result<T>) | ✅ |
| BP-04 | Strongly-typed IDs | ✅ |
| BP-05 | EF Core snake_case naming | ✅ |
| BP-06 | JWT with refresh token rotation | ✅ |
| BP-07 | BCrypt work factor ≥ 12 | ✅ |
| BP-08 | Refresh tokens in HttpOnly cookies | ❌ (localStorage) |
| BP-09 | Content-Security-Policy header | ❌ Missing |
| BP-10 | Rate limiting on auth endpoints | ❌ Missing |
| BP-11 | User enumeration prevention | ❌ Email reflected in error |
| BP-12 | No `window.confirm()` for destructive UI | ❌ Used in 4+ places |
| BP-13 | Optimistic UI updates | ❌ All actions block on network |
| BP-14 | Composable / store unit tests | ❌ None |
| BP-15 | E2E tests in CI pipeline | ❌ Not wired |
| BP-16 | Virtual scrolling for long lists | ❌ Missing |
| BP-17 | No stub implementations masking as real features | ❌ Profile/password/avatar |
| BP-18 | Concurrent token refresh mutex | ❌ Missing |
| BP-19 | Tauri composables have web fallbacks | ❌ useDisplayMonitors breaks in web |
| BP-20 | Song library persisted to backend | ❌ Local-only |
| BP-21 | Verse ref format validated on frontend | ❌ Missing |
| BP-22 | `[Authorize]` on SignalR hub | ⚠️ Needs verification |
| BP-23 | dotnet-ef tool version pinned | ⚠️ Needs verification |
| BP-24 | Component `inheritAttrs: false` where needed | ❌ STooltip missing |
| BP-25 | CSP-safe inline styles avoided | ⚠️ Many inline style bindings |

---

## 9. Recommended Priority Order

### Sprint 1 — Fix What's Broken
1. **Fix Add Day verse ref format** — change backend to accept `BOOK.CHAPTER` refs or add verse selector to UI
2. **Implement profile + password endpoints** — remove stub toasts; ship real API
3. **Fix `canvasTextStyle`/`canvasRefStyle` undefined** — declare computed refs in PresenterView

### Sprint 2 — Close Security Gaps
4. Move refresh token to `HttpOnly` cookie
5. Add Content-Security-Policy header
6. Add auth rate limiting
7. Generic registration error (fix user enumeration)
8. Concurrent refresh mutex in HTTP interceptor

### Sprint 3 — Core Feature Completeness
9. Implement note editing (wire `notes.update()` to a UI)
10. Persist songs to backend (create `POST /api/songs` endpoint)
11. Fix participant display names in Plan Detail
12. Wire `useActivityFeed` to real data sources
13. Add `useDisplayMonitors` web fallback

### Sprint 4 — Polish & Testing
14. Replace `window.confirm()` with design-system modal
15. Add note create success toast
16. Add virtual scrolling for note and plan day lists
17. Wire Playwright to CI
18. Add unit tests for domain entities and key composables
19. Fix STooltip `inheritAttrs`
20. Remove deprecated `apple-mobile-web-app-capable` meta
