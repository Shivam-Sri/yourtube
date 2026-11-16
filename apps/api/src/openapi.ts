/* eslint-disable @typescript-eslint/no-explicit-any */
// OpenAPI 3.0 description of the REST API. Served by Swagger UI at /api/docs
// (raw JSON at /api/docs.json). Keep in sync with src/routes/*.

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema: any) => ({ "application/json": { schema } });
const CATEGORIES = ["Tech", "Music", "Gaming", "Education", "Entertainment", "News", "Sports", "Lifestyle", "Other"];
const QUALITIES = ["2160p", "1440p", "1080p", "720p", "480p", "360p", "Auto"];
const RATIOS = ["16:9", "9:16", "4:3", "1:1"];

export const openapi: any = {
  openapi: "3.0.3",
  info: {
    title: "YourTube API",
    version: "0.2.0",
    description:
      "Video aggregator: videos are stored as embeddable links (YouTube, Vimeo, Dailymotion, Google Drive, ...), one `StreamSource` per quality. " +
      "No files are uploaded or hosted.\n\n" +
      "Browsing uses keyset (cursor) pagination: pass `nextCursor` back as `cursor` until it is `null`. " +
      "Search (`q`) uses PostgreSQL full-text search and returns the top matches without a cursor.",
  },
  servers: [{ url: "/api", description: "This server" }],
  tags: [{ name: "System" }, { name: "Videos" }],
  paths: {
    "/health": {
      get: {
        tags: ["System"],
        summary: "Health check",
        responses: { 200: { description: "OK", content: json({ type: "object", properties: { ok: { type: "boolean" } } }) } },
      },
    },
    "/videos": {
      get: {
        tags: ["Videos"],
        summary: "List or search videos",
        description:
          "Without `q`: newest first, keyset-paginated. With `q`: full-text search (weighted title > tags > description, " +
          "ranked by ts_rank_cd; supports `\"exact phrase\"`, `-excluded`, `a or b`).",
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 50, default: 24 } },
          { name: "cursor", in: "query", description: "`nextCursor` from the previous page (ignored with `q`).", schema: { type: "string", format: "uuid" } },
          { name: "category", in: "query", schema: { type: "string", enum: CATEGORIES } },
          { name: "q", in: "query", description: "Full-text search query (max 100 chars).", schema: { type: "string", maxLength: 100 }, example: "blender animation" },
        ],
        responses: {
          200: { description: "A page of videos", content: json(ref("VideoList")) },
          400: { description: "Invalid cursor", content: json(ref("Error")) },
        },
      },
      post: {
        tags: ["Videos"],
        summary: "Submit a video (embed links)",
        description:
          "Creates a video with one StreamSource per quality. Embed URLs must be https and match the host/path allowlist " +
          "(extend with the `EMBED_HOST_ALLOWLIST` env var). Rate limited to 20 submissions per 15 minutes per IP.",
        requestBody: { required: true, content: json(ref("CreateVideo")) },
        responses: {
          201: { description: "Created", content: json({ type: "object", properties: { id: { type: "string", format: "uuid" }, slug: { type: "string" } } }) },
          400: { description: "Validation failed", content: json(ref("ValidationError")) },
          429: { description: "Rate limited", content: json(ref("Error")) },
        },
      },
    },
    "/videos/categories": {
      get: {
        tags: ["Videos"],
        summary: "Categories with video counts",
        responses: {
          200: {
            description: "Categories in use",
            content: json({
              type: "object",
              properties: {
                items: { type: "array", items: { type: "object", properties: { category: { type: "string" }, count: { type: "integer" } } } },
              },
            }),
          },
        },
      },
    },
    "/videos/{slug}": {
      get: {
        tags: ["Videos"],
        summary: "Get a video with its stream sources",
        parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" }, example: "big-buck-bunny-xxxxxx" }],
        responses: {
          200: { description: "The video", content: json(ref("VideoDetail")) },
          404: { description: "Not found", content: json(ref("Error")) },
        },
      },
    },
    "/videos/{slug}/related": {
      get: {
        tags: ["Videos"],
        summary: "Related videos",
        description: "Tag-overlap matches first (GIN `tags &&`), then same category.",
        parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Up to 12 videos", content: json({ type: "object", properties: { items: { type: "array", items: ref("VideoCard") } } }) } },
      },
    },
  },
  components: {
    schemas: {
      Error: { type: "object", properties: { error: { type: "string" } } },
      ValidationError: {
        type: "object",
        properties: {
          error: { type: "string" },
          issues: { type: "array", items: { type: "object", properties: { path: { type: "string" }, message: { type: "string" } } } },
        },
      },
      AspectRatio: { type: "string", enum: ["RATIO_16_9", "RATIO_9_16", "RATIO_4_3", "RATIO_1_1"] },
      Creator: {
        type: "object",
        properties: { username: { type: "string" }, handle: { type: "string" }, avatarUrl: { type: "string" } },
      },
      StreamSource: {
        type: "object",
        properties: { id: { type: "string", format: "uuid" }, quality: { type: "string", enum: QUALITIES }, embedUrl: { type: "string" } },
      },
      VideoCard: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          slug: { type: "string" },
          thumbnailUrl: { type: "string" },
          aspectRatio: ref("AspectRatio"),
          category: { type: "string" },
          views: { type: "integer" },
          likes: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
          creator: ref("Creator"),
        },
      },
      VideoList: {
        type: "object",
        properties: { items: { type: "array", items: ref("VideoCard") }, nextCursor: { type: "string", nullable: true } },
      },
      VideoDetail: {
        allOf: [
          ref("VideoCard"),
          {
            type: "object",
            properties: {
              description: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
              updatedAt: { type: "string", format: "date-time" },
              streamSources: { type: "array", items: ref("StreamSource") },
            },
          },
        ],
      },
      CreateVideo: {
        type: "object",
        required: ["title", "thumbnailUrl", "streamSources"],
        properties: {
          title: { type: "string", minLength: 3, maxLength: 120, example: "Big Buck Bunny" },
          description: { type: "string", maxLength: 5000 },
          thumbnailUrl: { type: "string", example: "https://i.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg" },
          aspectRatio: { type: "string", enum: RATIOS, default: "16:9" },
          category: { type: "string", enum: CATEGORIES, default: "Other" },
          tags: { type: "array", maxItems: 15, items: { type: "string" }, example: ["animation", "blender"] },
          streamSources: {
            type: "array",
            minItems: 1,
            maxItems: 7,
            items: {
              type: "object",
              required: ["quality", "embedUrl"],
              properties: {
                quality: { type: "string", enum: QUALITIES },
                embedUrl: { type: "string", example: "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?rel=0" },
              },
            },
          },
        },
      },
    },
  },
};
