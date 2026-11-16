import { Router, Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import slugify from "slugify";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { AspectRatio, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { allowedEmbedHosts, isAllowedEmbed } from "../lib/embed";

const router = Router();

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

export const CATEGORIES = ["Tech", "Music", "Gaming", "Education", "Entertainment", "News", "Sports", "Lifestyle", "Other"] as const;
const QUALITIES = ["2160p", "1440p", "1080p", "720p", "480p", "360p", "Auto"] as const;
const RATIOS: Record<string, AspectRatio> = {
  "16:9": AspectRatio.RATIO_16_9,
  "9:16": AspectRatio.RATIO_9_16,
  "4:3": AspectRatio.RATIO_4_3,
  "1:1": AspectRatio.RATIO_1_1,
};
const clampLimit = (v: unknown, def: number) => Math.min(Math.max(Number(v) || def, 1), 50);

/* ---------------------------- card shape ---------------------------- */
const cardSelect = {
  id: true,
  title: true,
  slug: true,
  thumbnailUrl: true,
  aspectRatio: true,
  category: true,
  views: true,
  likes: true,
  createdAt: true,
  creator: { select: { username: true, handle: true, avatarUrl: true } },
} satisfies Prisma.VideoSelect;

/**
 * GET /videos?limit=&cursor=&category=&q=
 *  - no q : keyset pagination (Prisma cursor on the (createdAt DESC, id DESC) index), O(log n) at any depth
 *  - q    : PostgreSQL full-text search over the generated, weighted tsvector (GIN), ranked by ts_rank_cd.
 *           Returns the top `limit` matches (no cursor).
 */
router.get(
  "/",
  wrap(async (req, res) => {
    const limit = clampLimit(req.query.limit, 24);
    const category =
      typeof req.query.category === "string" && (CATEGORIES as readonly string[]).includes(req.query.category)
        ? req.query.category
        : null;
    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";

    if (q) {
      const ranked = await prisma.$queryRaw<{ id: string }[]>`
        SELECT v.id
          FROM "Video" v, websearch_to_tsquery('english', ${q}) AS query
         WHERE v."searchVector" @@ query
           AND (${category}::text IS NULL OR v.category = ${category})
         ORDER BY ts_rank_cd(v."searchVector", query, 32) DESC, v."createdAt" DESC, v.id DESC
         LIMIT ${limit}`;
      const ids = ranked.map((r) => r.id);
      const rows = await prisma.video.findMany({ where: { id: { in: ids } }, select: cardSelect });
      const byId = new Map(rows.map((r) => [r.id, r]));
      res.json({ items: ids.map((id) => byId.get(id)!).filter(Boolean), nextCursor: null });
      return;
    }

    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : null;
    if (cursor && !/^[0-9a-f-]{36}$/i.test(cursor)) {
      res.status(400).json({ error: "Invalid cursor" });
      return;
    }
    const rows = await prisma.video.findMany({
      where: category ? { category } : undefined,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 0 } : {}),
      select: cardSelect,
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    res.json({ items, nextCursor: hasMore ? rows[limit].id : null });
  })
);

/** GET /videos/categories — category pills with counts (served by Video_category_createdAt_id_idx). */
router.get(
  "/categories",
  wrap(async (_req, res) => {
    const groups = await prisma.video.groupBy({ by: ["category"], _count: { _all: true }, orderBy: { category: "asc" } });
    res.json({ items: groups.map((g) => ({ category: g.category, count: g._count._all })) });
  })
);

/** GET /videos/:slug/related — tag overlap (GIN `tags &&`), then same category, de-duplicated. */
router.get(
  "/:slug/related",
  wrap(async (req, res) => {
    const current = await prisma.video.findUnique({
      where: { slug: req.params.slug },
      select: { id: true, tags: true, category: true },
    });
    if (!current) {
      res.json({ items: [] });
      return;
    }
    const byTag = current.tags.length
      ? await prisma.video.findMany({
          where: { id: { not: current.id }, tags: { hasSome: current.tags } },
          orderBy: { views: "desc" },
          take: 12,
          select: cardSelect,
        })
      : [];
    const seen = new Set([current.id, ...byTag.map((v) => v.id)]);
    const byCategory = await prisma.video.findMany({
      where: { id: { notIn: [...seen] }, category: current.category },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 12 - byTag.length > 0 ? 12 - byTag.length : 0,
      select: cardSelect,
    });
    res.json({ items: [...byTag, ...byCategory] });
  })
);

/** GET /videos/:slug — full video with its stream sources. */
router.get(
  "/:slug",
  wrap(async (req, res) => {
    const video = await prisma.video.findUnique({
      where: { slug: req.params.slug },
      select: {
        ...cardSelect,
        description: true,
        tags: true,
        updatedAt: true,
        streamSources: { select: { id: true, quality: true, embedUrl: true } },
      },
    });
    if (!video) {
      res.status(404).json({ error: "Video not found" });
      return;
    }
    // Best resolution first; "Auto" last.
    const rank = (q: string) => (q === "Auto" ? 0 : parseInt(q, 10) || 0);
    video.streamSources.sort((a, b) => rank(b.quality) - rank(a.quality) || (a.quality === "Auto" ? 1 : -1));
    res.json(video);
  })
);

/* ------------------------------ create ------------------------------ */
const httpsUrl = z
  .string()
  .max(2048)
  .refine((u) => {
    try {
      return new URL(u).protocol === "https:";
    } catch {
      return false;
    }
  }, "Must be a valid https:// URL");

const createSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(5000).default(""),
  thumbnailUrl: httpsUrl,
  aspectRatio: z.enum(["16:9", "9:16", "4:3", "1:1"]).default("16:9"),
  category: z.enum(CATEGORIES).default("Other"),
  tags: z
    .array(z.string().trim().toLowerCase().min(1).max(30))
    .max(15)
    .default([])
    .transform((t) => [...new Set(t)]),
  streamSources: z
    .array(
      z.object({
        quality: z.enum(QUALITIES),
        embedUrl: httpsUrl.refine(
          isAllowedEmbed,
          `Embed URL host/path is not allowed. Allowed hosts: ${allowedEmbedHosts.join(", ")}`
        ),
      })
    )
    .min(1)
    .max(7)
    .refine((s) => new Set(s.map((x) => x.quality)).size === s.length, "Each quality may appear only once"),
});

const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many submissions, try again later." },
});

const newSlug = (title: string) =>
  `${slugify(title, { lower: true, strict: true }).slice(0, 70) || "video"}-${randomBytes(3).toString("hex")}`;

/** POST /videos — submit a video as embed links (no files). */
router.post(
  "/",
  submitLimiter,
  wrap(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) });
      return;
    }
    const d = parsed.data;

    // No auth yet: submissions are attributed to a shared "community" user.
    const creator = await prisma.user.upsert({
      where: { handle: "community" },
      update: {},
      create: { username: "Community", handle: "community", email: "community@yourtube.example" },
    });

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const video = await prisma.video.create({
          data: {
            title: d.title,
            slug: newSlug(d.title),
            description: d.description,
            thumbnailUrl: d.thumbnailUrl,
            aspectRatio: RATIOS[d.aspectRatio],
            category: d.category,
            tags: d.tags,
            creatorId: creator.id,
            streamSources: { create: d.streamSources },
          },
          select: { id: true, slug: true },
        });
        res.status(201).json(video);
        return;
      } catch (e) {
        // P2002 = unique violation (slug collision): retry with a new suffix.
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
      }
    }
    res.status(409).json({ error: "Could not allocate a unique slug, try again" });
  })
);

export default router;
