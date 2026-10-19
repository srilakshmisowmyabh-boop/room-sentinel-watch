<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## SENSE GUARD backend
- Roles live only in `user_roles`; RLS (has_role/is_member) enforces Owner-only writes — UI hiding is cosmetic. Why: security must hold even if the client is bypassed.
- ESP32 readings arrive only via `/api/public/devices/ingest`, authenticated by per-device keys stored as SHA-256 hashes in `device_keys` (no client access). Why: devices can't hold user sessions.
- Alert threshold/persistence rules live in `src/lib/detection.ts` (pure, unit-tested). Why: one tested source of truth.
- `GuardProvider` switches between live Cloud data (`live-store.tsx`) and simulated data (Demo mode, per browser). Why: pages consume one `useGuard()` interface.
- Account creation uses a public validated server function plus a locked auth lifecycle trigger and permanent bootstrap flag; public Auth signup is disabled. Why: invitations cannot be bypassed and single-use consumption is atomic.
- Viewer revocation sets membership revoked_at before banning the Auth account; all membership policies exclude revoked rows. Why: existing tokens immediately lose database access and future sign-ins are blocked.
- Owner Viewer management uses authenticated server functions and owner-scoped database RPCs. Why: private emails and sign-in timestamps never appear in public queries.
