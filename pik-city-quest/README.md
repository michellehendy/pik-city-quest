# PIK CITY QUEST

Interactive tourism gamification web app for Pantai Indah Kapuk (PIK), Jakarta, built for PIK Tourism Board.
**EXPLORE PIK. COMPLETE QUESTS. COLLECT EXPERIENCES.**

A mobile-first Progressive Web App (no download required, works from a QR scan) with a separate admin console. It is designed to live at `piktourism.com/city-quest` and to complement, not replace, piktourism.com.

## Quick start

```bash
npm install            # also runs `prisma generate`
npm run db:reset       # creates the SQLite database and seeds it
npm run dev            # http://localhost:3000
```

Production:

```bash
npm run build && npm start
```

### Demo accounts (seeded)

| Role | Email | Password | Where |
|---|---|---|---|
| Visitor (active quest in progress) | michelle@example.com | Explorer123! | `/` |
| Super admin | admin@piktourism.local | Admin123! | `/admin` |
| Quest manager | quests@piktourism.local | Quest123! | `/admin` |
| Verification admin | verify@piktourism.local | Verify123! | `/admin/verification` |
| Partner / venue admin (Express Fun) | partner@expressfun.local | Partner123! | `/admin` (scoped) |

Other seeded visitors for the leaderboard: rafi@example.com, sinta@example.com, kevin@example.com (Explorer123!).

Venue QR tokens for testing QR missions are printed at the end of `npm run db:seed` and can be downloaded as PNG/SVG from **Admin → QR Codes**. On a phone, scan the printed code; on desktop use **Enter code** on the mission screen and paste the token. The sample secret codes are `LIGHTHOUSE26` (Land's End) and `ROYALTRANS` (shuttle mission).

## What is in the box

**Visitor app** (`/`): Home dashboard (greeting, level/XP, current mission, today's challenges, destinations by area, popular quests, leaderboard preview), Quests (landing, filters by type/status/difficulty/duration/area, "Choose your quest"), quest detail (route map, checkpoint states, missions, rules confirmation, sticky continue CTA), mission runner (QR camera scan with jsQR + image/manual fallback, GPS check-in, quiz with timer, secret code, photo/video capture and upload, social link, ordered multi-step missions, rejection + retry), quest completion celebration (confetti, completion code, rewards, share cards for Instagram Story/Feed, WhatsApp, TikTok, download, Web Share API, public achievement page with QR), interactive map (Leaflet + CARTO tiles, areas, category filters, quest route with START/FINISH, user location, transport routes and stops, public facilities, destination card with Start mission / How to get there / Ask TauPIK / Visit destination), TauPIK assistant (page + floating button, chat history, suggestions, destination cards, quest context), profile (level progression, collapsible badge collection, badge detail + share, My Rewards with voucher QR, My Story journal with recap video, leaderboard with all-time/monthly/weekly/per-quest filters, Exchange My Rewards with Tourist Exclusive partners and points, settings incl. security/notifications/privacy/sharing/language/delete account, FAQ, logout), notifications centre, PWA manifest and icons.

**Admin console** (`/admin`, visually distinct): overview KPIs and charts with date/quest filters, 8-step quest builder (basic info → destinations → checkpoint order → missions → unlock rules → points & rewards → schedule → preview & publish), duplicate/publish/unpublish/archive, destination database, mission management with requirement/quiz editor and visitor preview, verification queue (search, filters, sort, review sheet with media + GPS, approve/reject with required reason, bulk review, history), QR code management (generate, download PNG/SVG, regenerate token, activate/deactivate, scan stats), rewards + redemption history, partner redemption scanner, badges and levels, challenges (daily/weekly/limited/bonus), events, transport routes and facilities, analytics (user/quest/mission/destination/reward performance, funnel, checkpoint drop-off, filters by date/quest/area/destination/mission type/segment, CSV exports), users & roles, audit log, XP rules & settings.

**Engine** (`src/lib/engine.ts`, `src/lib/gamification.ts`): sequential / open-route / minimum-N / custom unlock rules, server-side verification for every requirement type, idempotent XP ledger (unique transaction key prevents duplicate awards), checkpoint bonuses, new-destination XP, streaks, configurable levels, automatic badge evaluation (destination, area, category, tag, mission count, specific mission, quest completion, weekend, sunset, level, manual), reward issuance (quest completion, badge, points exchange, campaigns, Tourist Exclusive), single-use voucher redemption scoped to partners, challenges, notifications, audit log.

## Data provenance

Destinations (105 unique places with coordinates, photos, addresses, hours), destination categories, events, transport routes (Transjakarta, Royal Trans, Hub Connector, TREX, sea connection), public facilities and Tourist Exclusive tenants were imported from the public piktourism.com API in November 2026 (`prisma/seed-data/*.json`). Branding (Montserrat, teal #087088 / #40c0c8, sun yellow #f8b818) follows the PIK Tourism Board identity.

Everything that could not be sourced from the official site is clearly labelled **sample** data and is editable in the admin console: the seven example quests, missions, quiz questions, secret codes, badges, non-partner rewards (`isSample`), shuttle stop coordinates (route list is official, stop geometry is approximate), area assignment of destinations, and demo users. The reference file mentioned in the brief was not attached to the session, so the visual direction is based on piktourism.com and the brief itself.

## Configuration (`.env`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLite for local/demo (`file:./dev.db`). Switch `provider` in `prisma/schema.prisma` to `postgresql` for production; the schema uses portable types only. |
| `AUTH_SECRET` | JWT signing secret for session cookies (sessions are also stored and revocable in the DB). |
| `APP_URL` | Public URL used in emails, share links and printed QR codes (e.g. `https://piktourism.com/city-quest`). |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Sign-In (OAuth 2.0 code flow, redirect URI `/api/auth/google/callback`). Button shows a clear message when not configured. |
| `ANTHROPIC_API_KEY` | TauPIK live mode (Claude via the Anthropic SDK). Without it TauPIK runs in **labelled demo mode** using database retrieval. |
| `RESEND_API_KEY`, `MAIL_FROM` | Email delivery for verification and password reset (`src/lib/mail.ts`). Without a provider, links are logged and surfaced in-app in non-production. |
| `UPLOAD_DIR` | Local media storage; replace `src/lib/storage.ts` with S3/GCS for production. |

## Integration notes

- **TauPIK**: `src/lib/taupik.ts` exposes `askTauPik(userId, message)`. Live mode sends a cached PIK knowledge context (destinations, routes, events, partners) plus the visitor's active quest context to Claude and parses recommended destination cards. To use the official TauPIK backend instead, replace `liveAnswer()` with a call to that API and keep the same return shape.
- **piktourism.com**: destination cards link to the official destination pages; the import can be refreshed by re-running the scraping step and `npm run db:seed`.
- **QR codes** encode `APP_URL/qr/<random token>`; the token never exposes internal ids. Scanning routes the visitor to the right mission.
- **Security**: all authorisation is enforced in API routes and server components (`requirePermission`), passwords are bcrypt-hashed, sessions are DB-backed, inputs validated with zod, rate limiting on auth and verification endpoints, quiz answers and secret codes never reach the browser, GPS radius and QR tokens validated server-side, duplicate XP/redemption prevented by unique constraints, admin actions audited.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` / `npm run build` / `npm start` | Next.js 16 (Turbopack) |
| `npm run db:push` | Sync the Prisma schema |
| `npm run db:seed` | Seed data (resets tables) |
| `npm run db:reset` | Recreate database and seed |
| `npm run typecheck` | TypeScript check |
| `npx tsx scripts/dump-test-data.ts` | Print quest/checkpoint/QR data used by the end-to-end test |

## Tech stack

Next.js 16 (App Router, server components, route handlers, proxy guard), React 19, TypeScript, Tailwind CSS 4, Prisma 6 (SQLite → PostgreSQL), jose + bcryptjs (auth), zod (validation), Leaflet (maps), jsQR (camera scanning), qrcode (generation), Recharts (admin charts), canvas-confetti, Anthropic SDK (TauPIK live mode).
