-- CreateEnum
CREATE TYPE "AspectRatio" AS ENUM ('RATIO_16_9', 'RATIO_9_16', 'RATIO_4_3', 'RATIO_1_1');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "handle" VARCHAR(30) NOT NULL,
    "email" TEXT NOT NULL,
    "avatarUrl" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
-- "searchVector" is a GENERATED column: Postgres keeps it in sync, application code never writes it.
-- array_to_string is only STABLE, generated columns need IMMUTABLE, hence the wrapper function.
CREATE FUNCTION immutable_array_to_string(text[], text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$ SELECT array_to_string($1, $2) $$;

CREATE TABLE "Video" (
    "id" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "slug" TEXT NOT NULL,
    "description" VARCHAR(5000) NOT NULL DEFAULT '',
    "thumbnailUrl" TEXT NOT NULL,
    "aspectRatio" "AspectRatio" NOT NULL DEFAULT 'RATIO_16_9',
    "category" TEXT NOT NULL DEFAULT 'Other',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "creatorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "searchVector" tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english'::regconfig, coalesce("title", '')), 'A')
     || setweight(to_tsvector('english'::regconfig, coalesce(immutable_array_to_string("tags", ' '), '')), 'B')
     || setweight(to_tsvector('english'::regconfig, coalesce("description", '')), 'C')
    ) STORED,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Video_views_nonneg" CHECK ("views" >= 0),
    CONSTRAINT "Video_likes_nonneg" CHECK ("likes" >= 0)
);

-- CreateTable
CREATE TABLE "StreamSource" (
    "id" UUID NOT NULL,
    "quality" VARCHAR(16) NOT NULL,
    "embedUrl" TEXT NOT NULL,
    "videoId" UUID NOT NULL,

    CONSTRAINT "StreamSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" UUID NOT NULL,
    "content" VARCHAR(2000) NOT NULL,
    "videoId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "parentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Video_slug_key" ON "Video"("slug");

-- CreateIndex
CREATE INDEX "Video_createdAt_id_idx" ON "Video"("createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "Video_category_createdAt_id_idx" ON "Video"("category", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "Video_creatorId_createdAt_idx" ON "Video"("creatorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Video_tags_idx" ON "Video" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "Video_searchVector_idx" ON "Video" USING GIN ("searchVector");

-- CreateIndex
CREATE UNIQUE INDEX "StreamSource_videoId_quality_key" ON "StreamSource"("videoId", "quality");

-- CreateIndex
CREATE INDEX "Comment_videoId_createdAt_id_idx" ON "Comment"("videoId", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

-- CreateIndex
CREATE INDEX "Comment_authorId_idx" ON "Comment"("authorId");

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamSource" ADD CONSTRAINT "StreamSource_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
