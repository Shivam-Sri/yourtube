# YourTube

Video aggregator. Videos are stored as **embeddable links** (YouTube, Vimeo, Dailymotion, Google Drive, ...),
one link per quality. Nothing is uploaded, transcoded or hosted here. Monorepo with two workspaces:

- `apps/web` - Next.js 15 (App Router, TypeScript, Tailwind CSS 3 + `@tailwindcss/container-queries`), SSR, dynamic SEO metadata, JSON-LD `VideoObject`
- `apps/api` - Express REST API, PostgreSQL via Prisma 6, Swagger UI

## Run locally

PostgreSQL 13+ is required. Either:

```bash
docker compose up -d                      # Postgres 16 on :5432 (user/pass/db: yourtube)
```

or install it natively (`winget install PostgreSQL.PostgreSQL.16`) and create a `yourtube` database,
then set `DATABASE_URL` in `apps/api/.env`.

```bash
npm install                               # also runs `prisma generate`
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.example apps\web\.env.local
npm run migrate -w apps/api               # prisma migrate deploy
npm run seed                              # 10 real videos (6 landscape, 4 vertical), idempotent
npm run dev:api                           # http://localhost:4000/api  (Swagger: /api/docs)
npm run dev:web                           # http://localhost:3000
```

If port 4000 is taken, set `PORT` in `apps/api/.env` and update `API_INTERNAL_URL` / `NEXT_PUBLIC_API_URL`
in `apps/web/.env.local` (for example `http://127.0.0.1:4010/api`).

The seed can be re-run at any time: videos are upserted by slug, stream sources are replaced, view/like counters are kept.
Seed embeds use `youtube-nocookie.com/embed/<id>?vq=hd1080|hd720|large`; YouTube treats `vq` as a hint and may ignore it.

## API

| Route | Notes |
|---|---|
| `GET /api/videos?limit&cursor&category&q` | no `q`: keyset-paginated, newest first. With `q`: full-text search ranked by `ts_rank_cd` |
| `GET /api/videos/categories` | categories in use with counts |
| `GET /api/videos/:slug` | video + `streamSources[]` (best quality first, `Auto` last) |
| `GET /api/videos/:slug/related` | tag overlap first, then same category |
| `POST /api/videos` | submit a video; zod-validated, rate limited (20 / 15 min / IP), attributed to a shared "community" user |

Embed URLs must be `https` and match a host + path allowlist (`apps/api/src/lib/embed.ts`).
Add hosts with `EMBED_HOST_ALLOWLIST=host1,host2` in `apps/api/.env`.
Interactive docs: `/api/docs` (raw spec at `/api/docs.json`).

## Database and indexing (`apps/api/prisma`)

Models: `User`, `Video`, `StreamSource`, `Comment`. `AspectRatio` enum: `RATIO_16_9`, `RATIO_9_16`, `RATIO_4_3`, `RATIO_1_1`.

| Technique | Index | Serves |
|---|---|---|
| Generated weighted `tsvector` + GIN | `Video_searchVector_idx` | `?q=` (`websearch_to_tsquery`, title > tags > description) |
| GIN on `text[]` | `Video_tags_idx` | related videos (`tags &&`) |
| Keyset pagination, `(createdAt DESC, id DESC)` | `Video_createdAt_id_idx` | home feed, constant-time deep paging |
| Composite with category prefix | `Video_category_createdAt_id_idx` | category pills + category counts |
| Composite per creator | `Video_creatorId_createdAt_idx` | channel listing |
| Unique `(videoId, quality)` | `StreamSource_videoId_quality_key` | one link per quality; `ON DELETE CASCADE` |

The migration SQL is hand-written because Prisma cannot express a generated `tsvector` column;
`schema.prisma` mirrors it as `Unsupported("tsvector")`. `prisma migrate diff` reports no drift.

## Responsive layout

All custom CSS is in `apps/web/src/styles/responsive-player.css`:

- **Player** (`IframeVideoPlayer`): `dvh` units everywhere. 16:9, 4:3 and 1:1 use `width:100%; aspect-ratio; max-height:82dvh; max-width:calc(82dvh * ratio)`.
  9:16 uses `height:80dvh` with `max-width:100%`, edge-to-edge on phones.
- **Rotated phones** (`max-height:500px` + landscape): player stage 94dvh, square corners, header hidden, quality buttons in a side rail.
- **Ultrawide** (`min-aspect-ratio:21/9`): player and quality rail beside a sticky info/related panel.
- **Feed**: `repeat(auto-fill, minmax(min(100%, 300px), 1fr))` with `clamp()` gaps.
- **Cards** (`VideoCard`): `@container`; stacked below 380px, side-by-side from 380px (single-column phone feeds, watch sidebar).
  Multi-column feed cards stay stacked so the grid does not flip layouts as columns appear.
- **Input modes**: `(hover:none) and (pointer:coarse)` gives 44px tap targets; `(hover:hover) and (pointer:fine)` adds hover lift/preview.
  `prefers-reduced-motion` disables the animations; `env(safe-area-inset-*)` keeps content clear of notches.

## Notes

- Streaming metadata in Next 15 returns HTTP 200 for missing pages, so `generateMetadata` calls `notFound()` itself and there is no `loading.tsx` under `watch/[slug]`.
- Not implemented: auth, comments/likes write endpoints, view counting, channel pages, sitemap.
