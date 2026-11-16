import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

import { getVideoBySlug } from "@/lib/api";
import { safeJsonLd, truncate } from "@/lib/seo";
import { RATIO_LABEL } from "@/lib/ratio";
import IframeVideoPlayer from "@/components/player/IframeVideoPlayer"; // "use client"
import RelatedVideos from "@/components/video/RelatedVideos"; // async server component

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

type Props = { params: Promise<{ slug: string }> };

// Always render on the server per request (the API fetch is cached for 60s in lib/api).
export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/* SEO: dynamic metadata                                               */
/* ------------------------------------------------------------------ */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const video = await getVideoBySlug(slug); // deduped with the page via React.cache
  if (!video) notFound(); // real 404 status even with streamed metadata

  const url = `${SITE_URL}/watch/${video.slug}`;
  const description = truncate(
    video.description.replace(/\s+/g, " ").trim() ||
      `Watch ${video.title} by ${video.creator.username} on YourTube.`,
    160
  );
  const embedUrl = video.streamSources[0]?.embedUrl;
  const vertical = video.aspectRatio === "RATIO_9_16";

  return {
    title: video.title, // layout template: "%s | YourTube"
    description,
    keywords: video.tags,
    alternates: { canonical: url },
    robots: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large" },
    openGraph: {
      type: "video.other",
      url,
      siteName: "YourTube",
      title: video.title,
      description,
      images: [{ url: video.thumbnailUrl, alt: video.title }],
      ...(embedUrl
        ? {
            videos: [
              {
                url: embedUrl,
                type: "text/html",
                width: vertical ? 720 : 1280,
                height: vertical ? 1280 : 720,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: video.title,
      description,
      images: [video.thumbnailUrl],
    },
  };
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default async function WatchPage({ params }: Props) {
  const { slug } = await params;
  const video = await getVideoBySlug(slug);
  if (!video) notFound();

  const url = `${SITE_URL}/watch/${video.slug}`;

  // JSON-LD VideoObject -> eligible for Google video rich results
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description: video.description || video.title,
    thumbnailUrl: [video.thumbnailUrl],
    uploadDate: video.createdAt,
    embedUrl: video.streamSources[0]?.embedUrl,
    url,
    keywords: video.tags.join(", "),
    genre: video.category,
    author: { "@type": "Person", name: video.creator.username },
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: { "@type": "WatchAction" },
      userInteractionCount: video.views,
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <main className="yt-page yt-watch">
        <article className="min-w-0">
          <IframeVideoPlayer
            title={video.title}
            aspectRatio={video.aspectRatio}
            streamSources={video.streamSources}
          />

          <h1 className="yt-title mt-4 font-semibold">{video.title}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {video.creator.username} · {video.views.toLocaleString("en")} views ·{" "}
            <time dateTime={video.createdAt}>
              {new Date(video.createdAt).toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" })}
            </time>{" "}
            · {video.category} · {RATIO_LABEL[video.aspectRatio]}
          </p>

          <section className="mt-4 rounded-xl bg-neutral-100 p-3 text-sm dark:bg-neutral-800">
            {video.tags.length > 0 && (
              <p className="font-medium text-blue-600">{video.tags.slice(0, 5).map((t) => `#${t}`).join(" ")}</p>
            )}
            {/* Full description is in the HTML so crawlers index it */}
            <p className="mt-1 whitespace-pre-line">{video.description || "No description."}</p>
          </section>
        </article>

        <aside aria-label="Related videos" className="yt-watch__aside">
          <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />}>
            <RelatedVideos slug={video.slug} />
          </Suspense>
        </aside>
      </main>
    </>
  );
}
