# SolaHub – Architecture, Quality, Longevity Audit

Date: 2026-05-02 · Reviewer: AI agent (auto)

This pass focuses on architecture, code quality, modularity, maintainability, longevity,
and backend correctness. UI styling, copy, and tokens are out of scope (handled by another
track), and S\* design system components / S-shell files are intentionally untouched.

Severities:

- **P0** – correctness bug or security/data risk – fix immediately.
- **P1** – meaningful smell, brittle pattern, or perf/maintenance hazard – fix now.
- **P2** – nit / opportunistic improvement – fix only the highest impact ones.

---

## Backend (api/)

### P0

| #   | File / area                                                                         | Issue                                                                                                                                                                                                       | Fix                                                                                                  |
| --- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| B1  | `Infrastructure/Repositories/ReadingPlanRepository.cs:17,30`                        | `GetByUserAsync` and `GetByChurchAsync` do not `Include(p => p.Days)`. The DTO mapper accesses `plan.Days`, so list endpoints return empty `days` and the dashboard `plans.days.length` always renders `0`. | Include both `Days` and `Participants` in list queries; use `AsNoTracking()` for read paths.         |
| B2  | `Application/Commands/Auth/{Login,Register,RefreshToken}Command.cs`                 | Hard-coded `AccessTokenExpiry`/`RefreshTokenExpiry` ignore `Jwt:AccessTokenExpiryMinutes` and `Jwt:RefreshTokenExpiryDays` config. The signed JWT lifetime drifts from the `ExpiresAt` returned to clients. | Centralize in a `JwtOptions` (IOptions) bound from configuration; consume in handlers + token svc.   |
| B3  | `Infrastructure/Auth/JwtTokenService.cs:23-36` + `Program.cs:53-58`                 | JWT secret length validation duplicated in two places; manual `IConfiguration` parsing instead of options pattern.                                                                                          | Single `JwtOptions` with validation on bind; remove duplicate guard.                                 |
| B4  | `Application/DTOs/NoteDtos.cs:3-14` vs `API/Controllers/NotesController.cs:148-156` | Two `CreateNoteRequest`/`UpdateNoteRequest` records exist (DTO file + controller file). Only the controller-defined ones are used; DTO copies are dead.                                                     | Delete the dead DTO records (kept inside controller as transport contracts; canonical copy is one). |

### P1

| #   | File / area                                                                                                                                                          | Issue                                                                                                                                  | Fix                                                                                                       |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| B5  | `Infrastructure/Repositories/*Repository.cs`                                                                                                                         | Read paths (`GetByEmail`, `GetByRefreshTokenHash`, `GetByVerseRefAsync`, list endpoints) load tracked entities for read-only DTO maps. | Add `AsNoTracking()` to read-only queries to skip change tracking and improve perf.                       |
| B6  | `Application/Commands/Auth/{Register,Login,RefreshToken}CommandHandler.cs` + `Application/Commands/Notes/CreateNoteCommandHandler.cs` + `Plans/CreatePlanCommand.cs` | Static cross-handler mapping methods (`RegisterCommandHandler.MapToUserDto`, `CreateNoteCommandHandler.MapToDto`) tightly couple handlers across vertical slices. | Extract `*Mapper` static classes in `Application/Mappers` and inject (or call) from one place.            |
| B7  | `Infrastructure/Auth/JwtTokenService.cs:38-56`                                                                                                                       | `JwtSecurityTokenHandler` is the legacy handler; modern projects use `JsonWebTokenHandler` (faster, async-friendly).                   | Defer (P2) – not breaking; touch only if rewriting tokens.                                                |
| B8  | `API/Hubs/CollaborationHub.cs:29-37`                                                                                                                                 | `EnsurePlanParticipantAsync` opens a new DI scope and re-fetches the entire `ReadingPlan` (incl. owned Days+Participants) for every hub action.  | Add a lighter-weight `IsParticipantAsync(planId, userId)` method to repo and use it.                      |
| B9  | `Application/Commands/Auth/RevokeTokenCommand.cs` + `RegisterCommand` mapping                                                                                        | `RevokeTokenCommand` validation done inline; other auth commands use FluentValidation. Inconsistent.                                   | Add `RevokeTokenCommandValidator`.                                                                        |
| B10 | `API/Middleware/AuthRateLimitMiddleware.cs:22-25`                                                                                                                    | `int.Parse(raw, …)` will throw on cache corruption (stale non-numeric value).                                                          | Use `int.TryParse`; on failure, treat as 0 and continue.                                                  |

### P2

| #   | File / area                                                                            | Issue                                                                                                          | Fix                                                                                                |
| --- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| B11 | `API/Controllers/PlansController.cs` + `NotesController.cs` + `AuthController.cs`      | Repeated `Match<IActionResult>` mapping switch boilerplate in every endpoint.                                  | Defer – low value vs churn.                                                                        |
| B12 | `API/Controllers/AuthController.cs:29` (`CreatedAtAction(nameof(Register), value)`)    | `CreatedAtAction(nameof(Register), value)` will produce a `Location` header pointing back to the POST endpoint, which is semantically wrong for a non-GET-able resource. | Defer – minor Location header polish.                                                              |
| B13 | `appsettings.json` defaults                                                            | Empty placeholders for `Jwt:SecretKey` etc. – config error surface only at first request.                      | Already validated at startup; defer.                                                               |

---

## Frontend (src/)

### P0

| #   | File / area                                          | Issue                                                                                                                                                                                                                | Fix                                                                                                  |
| --- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| F1  | `src/services/http/client.ts` ↔ `src/main.ts`        | The 401 retry path dispatches `auth:session-expired`, but no listener calls `auth.handleSessionExpired()`. After the user's session expires they get stuck (token cleared but no redirect to `/login?reason=…`).     | Wire a top-level listener (in `main.ts` after Pinia init or in `App.vue`) that calls the auth store. |
| F2  | `src/views/PresenterDisplayView.vue:9-18`            | `collaborationService.on(...)` returns an unsubscribe but it's never stored or invoked in `onUnmounted`. Each route mount adds a duplicate listener that lives for the lifetime of the page.                          | Capture and call the unsubscribe in `onBeforeUnmount`.                                               |

### P1

| #   | File / area                                                       | Issue                                                                                                                                                                                                                                                                                          | Fix                                                                                                       |
| --- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| F3  | `src/views/BibleView.vue:28-33`                                   | `searchTimeout` is never cleared on unmount; if a user navigates away mid-debounce, the callback runs against a torn-down store path.                                                                                                                                                          | Clear in `onBeforeUnmount`.                                                                               |
| F4  | `src/composables/useResponsiveLayout.ts:30-31`                    | `rememberUserToggle` is exported but never invoked anywhere; the `userOverride` flag never flips, so the auto-collapse logic always wins. Either invoke from the topbar/sidebar handlers or remove the dead branch.                                                                            | Mark TODO in JSDoc; expose minimal sane behaviour and document.                                           |
| F5  | `src/stores/bible.store.ts:30-65`                                 | `loadChapter`/`search` swallow errors silently (`try/finally` only). Failures show the spinner but never surface to the UI.                                                                                                                                                                    | Add `error: ref<string \| null>` and set on catch.                                                        |
| F6  | `src/stores/auth.store.ts:8-89`                                   | `extractErrorMessage` lives at module scope; `handleSessionExpired` is exported but never wired (see F1).                                                                                                                                                                                      | Wire with F1; expose helper through `useAuth`.                                                            |
| F7  | `src/composables/useAuth.ts`                                      | Does not expose `handleSessionExpired`, blocking F1 wiring.                                                                                                                                                                                                                                    | Add to composable.                                                                                        |
| F8  | `src/services/http/client.ts:84`                                  | Dispatching a window event for an in-app concern is awkward; better to inject a callback or have the auth store register itself.                                                                                                                                                               | Keep current event but document; install listener once at bootstrap.                                      |
| F9  | `src/services/auth.service.ts:24`                                 | `await http.post(...).catch(() => {})` silently swallows network errors during logout — masks dev problems.                                                                                                                                                                                    | Log the error to console (allowed by eslint) before swallowing.                                           |
| F10 | `src/services/http/client.ts:53,59,86`                            | Throwing `error as Error` after `Promise.reject` blanket-casts; unknown error types lose context. Acceptable but noisy.                                                                                                                                                                        | Defer (P2).                                                                                               |
| F11 | `src/components/s/index.ts`                                       | `useSToast` exported alongside components – fine, but consumers of `useSToast` are also fine. No action.                                                                                                                                                                                       | Skip.                                                                                                     |

### P2

| #   | File / area                                            | Issue                                                                                              | Fix                                                                                              |
| --- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| F12 | `src/views/PlansView.vue:63-74` + `PlanDetailView.vue` | `statusTone` duplicated in two views.                                                              | Extract to `src/lib/plans.ts` helper.                                                            |
| F13 | `src/stores/notes.store.ts:15-23`                      | `notesByVerseRef` rebuilds the Map every read.                                                     | Already memoized via Vue's computed cache; OK.                                                   |
| F14 | `src/views/SettingsView.vue:69-71`                     | `saveProfile` is a pure UI stub.                                                                   | Defer – feature TBD.                                                                             |

---

## Process

1. ✅ Walk the codebase and produce this checklist.
2. Apply P0 fixes and re-run `dotnet build` / `npm run type-check`.
3. Apply P1 fixes and re-run.
4. Final: `npm run lint && npm run type-check && npm run build && cd api && dotnet test`.
