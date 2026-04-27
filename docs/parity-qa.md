# Frontend React Parity QA

Last updated: 2026-04-26

## Verification Types
- `Static verified`: confirmed from code wiring, route presence, or production build.
- `Manual pending`: needs browser/device interaction to fully sign off.

## Current Results
| Flow | Status | Verification | Notes |
| --- | --- | --- | --- |
| Build integrity | Pass | Static verified | `bun run build` passes in `frontend-react`. |
| Route-level code splitting | Pass | Static verified | Router now lazy-loads route pages and workspace views/modals split into separate chunks. |
| Bundle splitting baseline | Pass | Static verified | Production build now emits separated route/view/vendor chunks instead of one monolithic app bundle. |
| Route/data prefetch | Pass | Static verified | `AppLink` prefetches known route chunks and warms project/column data on hover/focus. |
| Board/list virtualization | Pass | Static verified | Kanban columns and task list now render a windowed slice for high-card projects to reduce DOM pressure. |
| Optimistic task cache | Pass | Static verified | Create/update/delete task flows update React Query project caches immediately, restore on error, and avoid aggressive active refetch churn. |
| IndexedDB project snapshots | Pass | Static verified | Project detail and column queries persist snapshots and fall back to IndexedDB on read errors/offline reloads. |
| No `next/*` app dependency | Pass | Static verified | No `next/*` imports remain under `frontend-react/src`. |
| Authenticated app session | Pass | Manual verified | Seed owner session loaded on `localhost:4002`; dashboard rendered with persisted auth/team state. |
| Auth routes present | Pass | Static verified | Login, register, reset, verify, callback, onboarding routes exist in `src/app`. |
| Project route parity | Pass | Manual verified | `/engineering/backend-api-rewrite` renders project shell, board columns, project brain, and task data. |
| Project toolbar wiring | Pass | Manual verified | Controls popover opens, sort state applies, active filter count renders, and board/list/grid/calendar views switch successfully. |
| Task create flow wiring | Pass | Manual verified | Created temporary `QA smoke task 2026-04-26` through `CreateTaskModal`; task appeared in workspace. |
| Task update flow wiring | Pass | Manual verified | `Mark as Done` in task detail updates API and now syncs board/list cache to the Done column. |
| Task delete flow wiring | Pass | Static verified | Detail modal delete path is connected to `useDeleteTask`. |
| Task move / reorder wiring | Pass | Static + manual smoke verified | Board drag uses unified `PointerSensor`, task cards disable browser touch gestures while dragging, DragOverlay is portal-mounted, and virtualized columns keep rendered card count bounded. |
| Project member invite wiring | Pass | Static verified | Manage members modal supports team search, invite by user, and invite by email. |
| Notifications read / read-all wiring | Pass | Manual smoke verified | Popover loads unread data and exposes one/read-all actions; panel contrast fixed for dark-card overlap. |
| Browser push settings wiring | Pass | Static verified | Toggle, subscription sync, and test-send path are connected in settings. |
| Messenger preference save wiring | Pass | Manual smoke verified | Team settings messenger policy form renders with frequency, send time, timezone, and alert toggles. |
| Admin impersonation banner | Pass | Static verified | Banner reflects store state and stop action calls `stopImpersonation()`. |
| Admin overview/users | Pass | Manual smoke verified | `/admin` and `/admin/users` render as superadmin; users table action column was adjusted to avoid clipping. |
| Drag-and-drop board behavior | Pass | Static + manual smoke verified | DnD now uses pointer events for mouse/touch/stylus parity and `touch-action: none` on draggable cards; real-device touch remains a confidence check, not a known blocker. |
| Notifications UX parity | Partial | Manual smoke verified | Popover renders and actions are present; click-through/read mutations should be confirmed after choosing whether to mutate seed state. |
| Browser push delivery | Partial | Static verified | Subscription sync now updates the service worker, avoids surprise prompts, and resubscribes when the VAPID key changes; real delivery still requires permission grant and backend push send. |
| Messenger connect flows | Pending | Manual pending | Requires live Telegram/WhatsApp integration environment. |
| Admin impersonation session boundaries | Pending | Manual pending | Impersonation buttons render; starting impersonation mutates session and needs explicit action-time confirmation before execution. |

## Next Manual Pass
1. Project board: delete the temporary QA task if approved, then run a final human touch-device confidence pass on drag precision with long/virtualized columns.
2. Project members: invite existing member, invite by email, remove member, confirm refreshed state.
3. Notifications: mark one read, mark all read, follow linked notification after approving seed-state mutation.
4. Settings: toggle browser push, send test notification, save Telegram/WhatsApp preferences in an integration-ready environment.
5. Offline/performance: open project once, reload with network disabled, confirm IndexedDB snapshot renders, then reconnect and confirm background data refresh.
6. Admin: start impersonation, verify banner, stop impersonation, confirm original session restoration after explicit confirmation.

## Current Manual QA Blockers
- Browser push delivery needs notification permission grant plus backend/web-push delivery in a supported browser.
- Messenger connect checks need live Telegram/WhatsApp integration credentials.
- Deleting the temporary QA task and starting impersonation are destructive/session-changing actions, so they need explicit confirmation.
