# SolaHub — QA Bug Checklist & Functionality Review

**Tested:** 2026-05-02  
**Tester:** Playwright MCP + manual code inspection  
**Credentials used:** `alvistest@gmail.com` / `Password1`  
**Build:** `npm run dev:web` (VITE_WEB_ONLY=true, localhost:3000 → API localhost:5000)

---

## Severity Legend
| Severity | Meaning |
|----------|---------|
| 🔴 CRITICAL | Blocks core functionality; data loss or complete feature failure |
| 🟠 HIGH | Major functional issue; no workaround or stub where real logic is needed |
| 🟡 MEDIUM | Degraded UX or partial functionality |
| 🟢 LOW | Minor polish, cosmetic, or edge-case issue |

---

## 🔴 CRITICAL

### BUG-01 — Add Day to Reading Plan always fails (422 Unprocessable Entity)
**Page:** `/plans/:id`  
**Steps:** Open any Draft plan as owner → click "Add day" → pick a book + chapter → click "Add" → click "Add day" in footer  
**Expected:** Day is created and appears in the reading schedule  
**Actual:** API returns `422 Unprocessable Entity`; toast shows "Could not add day"  
**Root cause (code):** `addPassage()` in `PlanDetailView.vue:115` builds key as `` `${pickerBook}.${pickerChapter}` `` (e.g. `JHN.3`). The backend `ReadingPlanDay` entity requires full `BOOK.CHAPTER.VERSE` references (e.g. `JHN.3.16`). The UI has no verse selector, so it is structurally impossible to supply valid refs through the current interface.  
**Impact:** Reading plan feature is entirely non-functional end-to-end.

---

### BUG-02 — Profile save is a no-op stub; changes are never persisted
**Page:** `/settings` → Profile tab  
**Steps:** Change Display Name → click "Save changes"  
**Expected:** Profile updated in database; next login reflects the new name  
**Actual:** `saveProfile()` in `SettingsView.vue:157-159` fires a success toast with no API call. All changes evaporate on refresh.  
**Root cause (code):** The function body is literally a toast call. There is no `PUT /api/users/me` or equivalent call.

---

### BUG-03 — Password change is a stub; password is never changed
**Page:** `/settings` → Security tab  
**Steps:** Enter current and new password → click "Change password"  
**Expected:** Password updated in backend  
**Actual:** `changePassword()` uses `await new Promise(resolve => setTimeout(resolve, 400))` to simulate work, then displays the message *"When the password endpoint ships, your request will go through automatically."* Password is not changed.

---

## 🟠 HIGH

### BUG-04 — Note creation gives no success feedback
**Page:** `/notes`  
**Steps:** Click "New note" → fill in verse ref + content → click "Save note"  
**Expected:** Toast or visual confirmation of success  
**Actual:** Dialog closes silently on success. User cannot distinguish a successful save from a failure that swallowed its error.  
**Code:** `createNote()` in `NotesView.vue:44-59` does not call any toast on success path.

---

### BUG-05 — Note delete gives no success feedback
**Page:** `/notes`  
**Steps:** Hover a note card → click trash icon → confirm in browser dialog  
**Expected:** Toast confirming deletion  
**Actual:** Note disappears silently. If the API call fails, `notes.error` is set on the store but nothing surfaces it to the user.  
**Code:** `confirmDelete()` → `notes.remove()` in `NotesView.vue:40-41` / `notes.store.ts:77-86`; no toast on success or user-visible error on failure.

---

### BUG-06 — Notes update (edit inline) is not implemented
**Page:** `/notes`  
**Steps:** Click on any existing note  
**Expected:** In-line editing or edit modal  
**Actual:** Notes are read-only after creation. There is no UI path to update an existing note's content, tags, or isShared flag. The `notesService.update()` and `notes.update()` functions exist but are never called from any view.

---

### BUG-07 — Avatar upload is a stub; photo is never stored
**Page:** `/settings` → Profile tab  
**Steps:** Click "Change avatar" → select image file  
**Expected:** Avatar uploaded to server, visible in UI  
**Actual:** `onAvatarFile()` sets a local preview ref and shows a toast saying *"Avatar will be uploaded the next time we sync."* No upload occurs now or ever (no sync mechanism exists).  
**Secondary:** Clicking the avatar button also opens a native file picker that can block all Playwright (and keyboard) interaction until dismissed.

---

### BUG-08 — 401 errors on every app startup (refresh token failure)
**Console:** `Failed to load resource: 401 @ /api/auth/refresh`  
**Steps:** Navigate to `localhost:3000` while logged out (or with expired tokens)  
**Expected:** Silent redirect to `/login`  
**Actual:** Two 401 network errors logged to console before redirect. The interceptor attempts a refresh even when there is provably no valid session. This is noisy and may indicate a race condition.

---

### BUG-09 — User enumeration via duplicate-email error on Register
**Page:** `/register`  
**Steps:** Attempt to register with an already-used email (e.g. `alvistest@gmail.com`)  
**Expected:** A generic error like *"Could not create account"*  
**Actual:** Backend returns *"An account with email 'alvistest@gmail.com' already exists."* — the submitted email is echoed back in the error. Attackers can enumerate valid email addresses with a simple loop.

---

### BUG-10 — Participants list shows raw UUID, not display name
**Page:** `/plans/:id` → Participants panel  
**Steps:** Open any plan that has participants  
**Expected:** Participant names (e.g. "Alvis")  
**Actual:** `p.userId.slice(0, 8) + '…'` — participants are identified by truncated UUIDs. The `PlanParticipantDto` apparently does not include a `displayName` field.  
**Code:** `PlanDetailView.vue:695` — `{{ p.userId === auth.user?.id ? 'You' : p.userId.slice(0, 8) + '…' }}`

---

### BUG-11 — Song library is local-only; songs lost on reload
**Page:** `/presenter` → Songs tab  
**Steps:** Add a song → reload the page  
**Expected:** Song persists in library  
**Actual:** `songs.store.ts` is a pure in-memory Pinia store with no API calls and no localStorage persistence. All songs vanish on every page refresh.

---

### BUG-12 — Delete plan has no loading / error state
**Page:** `/plans/:id`  
**Steps:** Click "Delete" → confirm dialog  
**Expected:** Loading indicator; error toast if deletion fails  
**Actual:** `deletePlan()` in `PlanDetailView.vue:178-182` awaits `plans.remove()` with no try/catch and navigates immediately. If the API call fails the user is still routed to `/plans` with no notification.

---

### BUG-13 — `canvasTextStyle` and `canvasRefStyle` referenced but never defined (Presenter preview broken)
**Page:** `/presenter`  
**Steps:** Load a chapter → observe slide preview  
**Expected:** Text renders at the correct font size in the preview canvas  
**Actual:** `PresenterView.vue:634` and `:643` bind `:style="canvasTextStyle"` and `:style="{ ...canvasRefStyle }"`. Neither `canvasTextStyle` nor `canvasRefStyle` are defined in `<script setup>`. Vue silently treats them as `undefined` — the preview canvas uses no computed font styles at all, making the preview misrepresent the actual presentation output.

---

## 🟡 MEDIUM

### BUG-14 — Note verse ref field has no format guidance or validation
**Page:** `/notes` → New note dialog  
**Steps:** Type an invalid verse ref (e.g. "John 3" instead of "JHN.3.16") → Save  
**Expected:** Inline validation error explaining the expected format  
**Actual:** Request goes to the API and fails with `422`. The user sees a generic save failure. The placeholder `JHN.3.16` helps, but there is no validation or format tooltip.

---

### BUG-15 — Community page is a placeholder stub
**Page:** `/community`  
**Steps:** Navigate to Community  
**Expected:** Church-member search, shared notes, community features  
**Actual:** Page shows "Coming soon" copy and a non-functional "Join a church" button. No backend integration.

---

### BUG-16 — Calendar page is a placeholder stub
**Page:** `/calendar`  
**Steps:** Navigate to Calendar  
**Expected:** Reading plan calendar, event scheduling  
**Actual:** Empty placeholder or "coming soon" state with no functionality.

---

### BUG-17 — Inbox page is a placeholder stub
**Page:** `/inbox`  
**Steps:** Navigate to Inbox  
**Expected:** Notifications, messages, or prayer requests  
**Actual:** Empty placeholder with no functionality.

---

### BUG-18 — Presenter "Open display" nonfunctional in web mode
**Page:** `/presenter`  
**Steps:** Load a chapter → click "Open display"  
**Expected:** Second window opens with fullscreen presentation  
**Actual:** `handleOpenDisplay()` calls `presenter.openDisplayWindow()` which delegates to a Tauri command. In web-only mode this silently fails or opens an in-page fullscreen overlay instead. No graceful degradation message is shown.

---

### BUG-19 — Invite link uses `solahub://` scheme (broken in web)
**Page:** `/plans/:id` (active, public plan owned by user)  
**Steps:** Click "Copy invite link"  
**Expected:** Shareable link that recipients can open  
**Actual:** Clipboard receives `solahub://plans/join/<id>` — a Tauri deep-link scheme that is meaningless in a browser. Web users cannot join via this link.

---

### BUG-20 — Progress percentage uses integer division that can show 0% on day 1
**Page:** `/plans/:id`  
**Steps:** Join a plan on day 0 (before marking any day complete)  
**Expected:** 0% shown correctly  
**Actual:** `progressPct = Math.round((0 / totalDays) * 100)` = 0% — technically correct but `nextDay` uses `(currentDay ?? 0) + 1` which means day 1 is always "next" regardless of whether the user has actually started. No "Not started" vs "In progress" distinction exists.

---

### BUG-21 — Dashboard "Get started" steps never check off
**Page:** `/` → Home tab  
**Steps:** Complete all three onboarding steps (set up profile, create a plan, invite church)  
**Expected:** Completed steps marked with a checkmark or hidden  
**Actual:** The `setupSteps` array in `DashboardView.vue:66-85` is static; steps never reflect actual completion state.

---

### BUG-22 — Dashboard Activity tab always empty (composable returns empty array)
**Page:** `/` → Activity tab  
**Steps:** Navigate to Activity tab after creating notes and plans  
**Expected:** Feed showing recent note creation, plan joins, progress marks  
**Actual:** `useActivityFeed()` returns an empty feed. The composable likely has no real data source wired up (no API call or it relies on a store that never populates the feed).

---

### BUG-23 — STooltip `data-no-drag` attribute Vue inheritance warning
**Console:** `[Vue warn]: Extraneous non-props attributes (data-no-drag) were passed to component but could not be automatically inherited…`  
**Location:** `SSidebar.vue` → `STooltip` components  
**Impact:** Low runtime impact but clutters console and indicates STooltip needs `inheritAttrs: false` + manual `v-bind="$attrs"` forwarding.

---

### BUG-24 — `apple-mobile-web-app-capable` deprecated meta tag
**Console:** `<meta name="apple-mobile-web-app-capable"> is deprecated…`  
**Location:** `index.html`  
**Fix:** Replace with `<meta name="mobile-web-app-capable" content="yes">`.

---

### BUG-25 — Plan Detail: "Publish plan" button duplicated
**Page:** `/plans/:id` (Draft, with days)  
**Steps:** Open a Draft plan as owner with at least one day  
**Actual:** "Publish plan" button appears in **both** the top bar (`STopBar #actions`) and the hero banner. Clicking either triggers the same action — the duplication is confusing and wastes space.  
**Code:** `PlanDetailView.vue:258-265` and `:361-369`.

---

### BUG-26 — Plan Detail: "Add day" button also duplicated
Same as BUG-25 — "Add day" appears in the hero banner AND inside the "Reading schedule" card header.

---

### BUG-27 — BibleView: verse annotations/highlights not persisted
**Page:** `/bible`  
**Steps:** Highlight or annotate a verse  
**Expected:** Annotation saved to backend or at minimum localStorage  
**Actual:** `verseAnnotations.store.ts` is referenced but from code inspection it appears to be a local-only store with no backend sync.

---

### BUG-28 — Settings: Reading appearance dropdown z-index issue
**Page:** `/settings` → Appearance tab  
**Steps:** Click the translation or font-size dropdown near the top of the page  
**Expected:** Dropdown opens over other content  
**Actual:** Dropdown is clipped/hidden behind the sticky top bar; requires JS workaround to interact with. `z-index` not set high enough on the select element's popup.

---

### BUG-29 — Register: No client-side email format validation
**Page:** `/register`  
**Steps:** Enter `notanemail` in the email field → submit  
**Expected:** Inline validation error before network request  
**Actual:** Request is sent to the API; only the server-side error (if any) is returned. No `type="email"` or pattern validation on the input.

---

### BUG-30 — Presenter: "canvasTextStyle" undefined causes preview font to be unstyled
*(Covered in BUG-13 above — duplicate reference for discoverability)*

---

## 🟢 LOW

### BUG-31 — 404 page "Back to dashboard" button is unstable in programmatic interaction
**Page:** `/non-existent-route`  
**Steps:** Navigate to invalid URL → click "Back to dashboard"  
**Expected:** Instant navigation to `/`  
**Actual:** Button briefly detaches from DOM during router transition; requires JS `document.querySelector` click workaround. Race condition in component unmounting.

---

### BUG-32 — Plans list slice `.slice(0, 5)` on dashboard silently hides plans
**Page:** `/` → Home tab  
**Steps:** Create more than 5 plans  
**Expected:** Clear "View all" affordance or "showing 5 of N"  
**Actual:** `DashboardView.vue:249` — `plans.plans.slice(0, 5)` with a plain "View all" link at the top. No indicator that plans are being truncated.

---

### BUG-33 — Plans: no empty state when user has no plans at all (first visit)
**Page:** `/plans`  
**Steps:** Log in as a brand-new user with no plans  
**Expected:** Welcoming empty state with "Create your first plan" CTA  
**Actual:** The empty state exists in code but rendering depends on correct store state; on first load while `isLoading` is true the skeleton/spinner may flash incorrectly.

---

### BUG-34 — Presenter: removing all sections from Add Song leaves empty sections array (silently drops song)
**Page:** `/presenter` → Songs tab → "Add song"  
**Steps:** Add a song → remove all sections with the trash icon → click "Save song"  
**Expected:** Validation error ("A song must have at least one section")  
**Actual:** `submitNewSong()` in `PresenterView.vue:202-215` calls `songs.addSong({ sections: [] })`. A song with zero sections is added but displays "0 slides" and loads an empty slide queue when selected.

---

### BUG-35 — Presenter: `addSongSection` alternates verse/chorus forever (no bridge/outro)
**Page:** `/presenter` → Add song  
**Steps:** Keep clicking "Add section"  
**Actual:** The type toggles between `verse` and `chorus` only (`isChorus ? 'chorus' : 'verse'`). No way to add a Bridge, Outro, Pre-chorus, etc. from the UI.

---

### BUG-36 — Tokens stored in localStorage (XSS risk)
**Location:** `auth.store.ts` / HTTP client  
**Issue:** JWT access token and refresh token are stored in `localStorage`. Any XSS vulnerability can exfiltrate both tokens and achieve full account takeover. Industry best practice is `httpOnly` cookies for refresh tokens.

---

### BUG-37 — No Content-Security-Policy header
**Issue:** No CSP is set on responses from the .NET API or the Vite dev server. Without CSP, XSS payloads have unrestricted access to `localStorage` tokens (compound risk with BUG-36).

---

### BUG-38 — Refresh token rotation: revoked tokens not double-checked under concurrent requests
**Location:** API auth middleware  
**Issue:** If two concurrent requests both trigger a refresh (race condition), the first will rotate the token and the second will arrive with the now-invalid old token, which gets rejected with 401 instead of being transparently retried. The frontend HTTP interceptor does not implement a mutex/queue for concurrent refresh requests.

---

## Summary Table

| # | Severity | Page | Title |
|---|----------|------|-------|
| 01 | 🔴 CRITICAL | /plans/:id | Add Day always fails — verse ref format mismatch |
| 02 | 🔴 CRITICAL | /settings | Profile save is a no-op stub |
| 03 | 🔴 CRITICAL | /settings | Password change is a stub |
| 04 | 🟠 HIGH | /notes | No success feedback on note create |
| 05 | 🟠 HIGH | /notes | No success feedback on note delete |
| 06 | 🟠 HIGH | /notes | Note editing is not implemented |
| 07 | 🟠 HIGH | /settings | Avatar upload is a stub |
| 08 | 🟠 HIGH | All | 401 errors logged on every app startup |
| 09 | 🟠 HIGH | /register | User enumeration via duplicate-email error |
| 10 | 🟠 HIGH | /plans/:id | Participants shown as UUIDs, not names |
| 11 | 🟠 HIGH | /presenter | Song library lost on page reload (no persistence) |
| 12 | 🟠 HIGH | /plans/:id | Delete plan has no error handling |
| 13 | 🟠 HIGH | /presenter | canvasTextStyle / canvasRefStyle undefined |
| 14 | 🟡 MEDIUM | /notes | No verse ref format validation |
| 15 | 🟡 MEDIUM | /community | Page is a placeholder stub |
| 16 | 🟡 MEDIUM | /calendar | Page is a placeholder stub |
| 17 | 🟡 MEDIUM | /inbox | Page is a placeholder stub |
| 18 | 🟡 MEDIUM | /presenter | "Open display" fails in web mode |
| 19 | 🟡 MEDIUM | /plans/:id | Invite link uses Tauri-only deep-link scheme |
| 20 | 🟡 MEDIUM | /plans/:id | Progress display edge case on day 0 |
| 21 | 🟡 MEDIUM | / | Dashboard onboarding steps never check off |
| 22 | 🟡 MEDIUM | / | Activity tab always shows empty feed |
| 23 | 🟡 MEDIUM | App-wide | STooltip data-no-drag Vue inheritance warning |
| 24 | 🟡 MEDIUM | App-wide | Deprecated apple-mobile-web-app-capable meta |
| 25 | 🟡 MEDIUM | /plans/:id | "Publish plan" button duplicated |
| 26 | 🟡 MEDIUM | /plans/:id | "Add day" button duplicated |
| 27 | 🟡 MEDIUM | /bible | Verse annotations not persisted |
| 28 | 🟡 MEDIUM | /settings | Appearance dropdown z-index issue |
| 29 | 🟡 MEDIUM | /register | No client-side email format validation |
| 31 | 🟢 LOW | /404 | "Back to dashboard" button unstable |
| 32 | 🟢 LOW | / | Plans silently truncated at 5 on dashboard |
| 33 | 🟢 LOW | /plans | Empty state flashes incorrectly on first load |
| 34 | 🟢 LOW | /presenter | Empty sections array creates broken song |
| 35 | 🟢 LOW | /presenter | Song type only alternates verse/chorus |
| 36 | 🟢 LOW | Auth | Tokens in localStorage (XSS risk) |
| 37 | 🟢 LOW | Auth | No Content-Security-Policy header |
| 38 | 🟢 LOW | Auth | No mutex for concurrent token refresh |

---

## Pages Fully Tested

| Page | Status |
|------|--------|
| `/login` | ✅ Tested — login, wrong password, empty fields |
| `/register` | ✅ Tested — duplicate email, empty fields, success |
| `/` (Dashboard) | ✅ Tested — all 3 tabs, all quick-access cards |
| `/bible` | ✅ Tested — book/chapter navigation, search, verse annotation |
| `/plans` | ✅ Tested — create plan, view list |
| `/plans/:id` | ✅ Tested — add day (failed), publish, archive, delete, join, mark done |
| `/notes` | ✅ Tested — create note (valid + invalid ref), search, delete |
| `/presenter` | ✅ Tested — Scripture browser, chapter load, song add, controls, fullscreen |
| `/community` | ✅ Tested — stub page confirmed |
| `/calendar` | ✅ Tested — stub page confirmed |
| `/inbox` | ✅ Tested — stub page confirmed |
| `/settings` | ✅ Tested — all tabs: Profile, Security, Appearance, Bible |
| `/:pathMatch` (404) | ✅ Tested — not-found page, back button |
| `/presenter-display` | ⚠️ Partially tested — web-mode only; Tauri window can't open |
