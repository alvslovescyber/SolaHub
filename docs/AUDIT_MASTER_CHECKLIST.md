# SolaHub — full-stack audit master checklist

Audit scope: **API (.NET / EF / SignalR)** and **frontend (Vue / Pinia / services)**. UI components (`.vue` templates/visuals) were not modified per request; logic fixes live in services, stores, middleware, repositories, and hub code.

Legend: `[x]` addressed in codebase · `[ ]` documented follow-up (larger change or product decision)

---

## Security

| Status | Item |
|--------|------|
| `[x]` | **JSON tag search**: Building JSON fragments for `JsonContains` via string interpolation allowed malformed JSON / injection-style breakage; use `JsonSerializer` for a JSON array fragment. |
| `[x]` | **JWT `sub` claim**: `Guid.Parse` on `NameIdentifier` could throw → unhandled 500; invalid/missing subject now yields **401** via `UnauthorizedAccessException` + middleware. |
| `[x]` | **SignalR hub inputs**: Unbounded `verseRef` / extreme `dayNumber` → validation caps (`HubException`). |
| `[ ]` | **Tokens in `localStorage`**: XSS can steal tokens; production hardening should move refresh/access to **httpOnly Secure cookies** + CSRF strategy (requires API + client contract change). |
| `[ ]` | **SignalR `access_token` query**: Browser/network logs may capture token; acceptable for many SPAs; mitigate with short-lived access tokens + WSS-only prod (TLS). |
| `[x]` | **Open redirect**: Router guards use internal route names only — no change required. |

---

## Backend performance & reliability

| Status | Item |
|--------|------|
| `[x]` | **Cartesian explosion**: `Include(Days).Include(Participants)` on reading plans → **`AsSplitQuery()`** on read paths. |
| `[x]` | **JWT handler allocation**: Reuse single **`JwtSecurityTokenHandler`** instance in token service. |
| `[x]` | **Progress/day validation**: **`RecordProgressCommandValidator`** bounds `DayNumber` before handler runs. |
| `[x]` | **`AddDbContextPool`**: Enabled for all environments **except** `Test` (integration factory uses plain `DbContext` against Testcontainers). |
| `[x]` | **EF.Relational version drift**: Integration test project pulled a mismatched **Microsoft.EntityFrameworkCore.Relational** (transitive 10.0.4 vs app 10.0.7). Pinned **10.0.7** explicitly to remove MSB3277 binding conflicts. |

---

## Frontend performance & reliability

| Status | Item |
|--------|------|
| `[x]` | **Bible API fetch**: **`AbortSignal`** cancels superseded chapter loads; **`encodeURIComponent`** on translation query param; load-generation guard avoids flipping loading state when a stale request finishes after a newer navigation. |
| `[x]` | **SignalR reconnect**: **`connect()`** stops a stale connection before building a new one **without** wiping `joinedPlans` (previous `disconnect()` cleared rejoin set). |
| `[x]` | **Pinia + router**: **`useRouter()` inside `auth` store** runs when the store is first used from **`router.beforeEach`**, outside Vue setup → injected router import used instead. |

---

## Code quality & operations

| Status | Item |
|--------|------|
| `[x]` | **Auth rate limit key**: Include **UTC minute bucket** so counters align to fixed windows instead of a single long-lived key shape. |
| `[ ]` | **Structured problem details**: Align 4xx/5xx bodies on **RFC 7807** across all endpoints (incremental). |
| `[ ]` | **Integration tests**: Extend coverage for hub validation + tag search edge cases. |

---

## Summary

Critical/low-risk fixes applied in-repo: **safe JSON for tags**, **hub bounds**, **401 for bad `sub`**, **split queries**, **JWT perf**, **FluentValidation on progress**, **Bible fetch cancel + encodeURI**, **SignalR connect lifecycle**, **auth store router**, **rate-limit bucket**, **EF.Relational pin**. Remaining items are mostly **token storage model**, **DbContext pooling**, and **API contract hardening** — intentional follow-ups.
