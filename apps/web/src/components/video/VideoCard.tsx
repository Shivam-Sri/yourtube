import Image from "next/image";
import Link from "next/link";
import type { VideoCardData } from "@/types";

const compact = new Intl.NumberFormat("en", { notation: "compact" });

/**
 * Container-query card. The wrapper is the query container (`@container`), so the
 * layout depends on the width the card is given, not on the viewport:
 *   < 380px  -> stacked: thumbnail on top
 *   >= 380px -> side by side: thumbnail left, metadata right
 * (e.g. single-column phone feeds and the wide watch-page sidebar).
 */
export default function VideoCard({ video }: { video: VideoCardData }) {
  const vertical = video.aspectRatio === "RATIO_9_16";
  return (
    <div className="yt-card-host @container">
      <Link
        href={`/watch/${video.slug}`}
        className="yt-card group flex flex-col gap-3 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 @[380px]:flex-row"
      >
        <div className="yt-card__thumb relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-neutral-200 @[380px]:w-[42%] @[380px]:max-w-[240px]">
          <Image
            src={video.thumbnailUrl}
            alt={video.title}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
          {vertical && (
            <span className="absolute left-1 top-1 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              Vertical / Short
            </span>
          )}
          {/* Desktop-only affordance (fine pointer + hover); see responsive-player.css */}
          <span
            aria-hidden="true"
            className="yt-card__play pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-neutral-900">
              ▶
            </span>
          </span>
        </div>

        <div className="min-w-0 flex-1 text-sm">
          <h3 className="yt-card__title line-clamp-2 font-medium group-hover:underline">{video.title}</h3>
          <p className="mt-0.5 text-xs text-neutral-500">{video.creator.username}</p>
          <p className="text-xs text-neutral-500">
            {compact.format(video.views)} views · {video.category}
          </p>
        </div>
      </Link>
    </div>
  );
}
