# Frontend React Parity Audit

Last updated: 2026-04-26

## Status Legend
- `Native`: implemented with app-owned routing/UI patterns, no `next/*` dependency in app code.
- `Ported`: available in `frontend-react` and builds, but still mostly copied from `web` and needs architecture/design cleanup.
- `Needs pass`: present, but still needs dedicated parity QA or deeper refactor before `web` replacement.

## Platform
| Area | Status | Notes |
| --- | --- | --- |
| Vite + Bun app shell | Native | `frontend-react` builds with Vite and Bun. |
| React Router route map | Native | Main public routes are wired in `src/router.tsx`. |
| `/v1` API integration | Native | Vite proxy and axios client are active. |
| Zustand + React Query | Native | Store and query provider are live. |
| Next compatibility removal | Native | No `next/*` imports remain under `frontend-react/src`. |
| Route/view code splitting | Native | Routes and heavy workspace views now load through lazy chunks. |
| Route/data prefetch | Native | App links warm known route chunks and project/column data before navigation. |
| Virtualized workspace rendering | Native | Board columns and task list use app-owned virtualization to keep large task sets responsive without a third-party runtime. |
| Optimistic task cache | Native | Create/update/delete task flows update project detail caches immediately, restore on error, and sync snapshots for offline reloads. |
| IndexedDB snapshots | Native | Project detail and column data are written to IndexedDB and used as read fallback when network reads fail. |
| PWA assets + service worker | Native | Versioned worker, static asset runtime cache, offline fallback, and registration update check are in place. |
| Browser push + offline handling | Native | Offline mutations are blocked, read-path cache is broader, and push subscription sync handles granted devices plus VAPID key rotation. |

## Experience Layers
| Area | Status | Notes |
| --- | --- | --- |
| Auth screens | Native | Login, register, forgot/reset password, verify email/request now use app-owned navigation and new UI primitives. |
| Invite entry flows | Ported | Team/project invite routes exist; still need architecture/UI cleanup. |
| Dashboard shell/navigation | Native | Sidebar, header, team switcher, and shell surface migrated to app-owned navigation and shared visual system. |
| Team/project workspace | Needs pass | Task detail surface, create/manage modals, board/list virtualization, and task mutation cache are native; remaining work is feature-by-feature browser QA and polish. |
| Notifications + messenger settings | Needs pass | Notifications are restyled and dashboard settings is partially migrated to shared primitives; messenger flow still needs a dedicated pass. |
| Admin console | Needs pass | Shell and core admin surfaces moved into the shared visual family; feature-by-feature QA still needed. |

## Route Parity Snapshot
| Route group | `web` | `frontend-react` | Status | Notes |
| --- | --- | --- | --- | --- |
| Auth | Yes | Yes | Native | Login/register/reset/verify screens are app-owned. |
| Dashboard | Yes | Yes | Needs pass | Shell is native; content slices still need deeper QA. |
| Team pages | Yes | Yes | Needs pass | Main team routes exist; settings/members/activity need interaction checks. |
| Project workspace | Yes | Yes | Needs pass | Board/list/grid/calendar and task detail are present; internals still need cleanup. |
| Invites | Yes | Yes | Needs pass | Token routes exist in the new app; acceptance flows need QA. |
| Notifications | Yes | Yes | Needs pass | Page and popover exist; unread/read-all behavior still needs verification. |
| My Tasks | Yes | Yes | Needs pass | Route exists; behavior still needs validation. |
| Admin | Yes | Yes | Needs pass | Routes exist and render, but still requires feature-by-feature checks. |
| Offline | Yes | Yes | Needs pass | Route exists, but browser/offline mutation behavior still unverified. |

## QA Checklist
- `Build`: `bun run build` passes.
- `Architecture`: no `next/*` imports remain in app source.
- `Auth`: login, register, forgot password, reset password, verify email, callback redirect.
- `Workspace shell`: sidebar, header, team switcher, mobile nav, impersonation banner.
- `Project workspace`: board render, virtualized long columns, create task, create project, manage project members, task detail modal, filters, drag-and-drop, task update/delete.
- `Settings`: profile update, browser push toggle, browser push test, Telegram link flow, WhatsApp connect flow, digest preference save.
- `Notifications`: popover render, notifications page render, read/read-all parity.
- `Admin`: overview, teams, users, payments, revenue, plans, impersonation boundaries.
- `Platform`: offline guard, service worker registration, browser push subscription sync.

Detailed flow tracking lives in [parity-qa.md](/Users/enrico/Developments/Colabo/frontend-react/docs/parity-qa.md).

## Remaining Work Before Replacing `web`
1. Run parity QA for auth, invites, board CRUD, billing, notifications, browser push, offline mode, and admin impersonation.
2. Validate real-world browser/device behavior for push, offline snapshots, drag-and-drop precision, long-board virtualization, and impersonation boundaries.
3. Promote `Needs pass` areas after browser-device QA or explicitly accept residual risks before cut-over.
