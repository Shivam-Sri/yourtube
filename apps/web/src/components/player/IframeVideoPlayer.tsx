"use client";

import { useState } from "react";
import type { AspectRatio, StreamSource } from "@/types";
import { RATIO_ATTR } from "@/lib/ratio";

interface Props {
  title: string;
  aspectRatio: AspectRatio;
  streamSources: StreamSource[];
}

/**
 * Sandboxed, viewport-fitting iframe player.
 *
 * All sizing lives in styles/responsive-player.css and is keyed on `data-ratio`:
 *  - 16:9 / 4:3 / 1:1 -> width:100%, aspect-ratio, max-height:82dvh, max-width:calc(82dvh * ratio)
 *  - 9:16             -> height:80dvh, aspect-ratio 9/16, max-width:100%, centred
 *  - rotated phones   -> 94dvh stage, square corners, chrome hidden, quality rail beside the video
 *  - ultrawide        -> player and quality rail side by side next to the info panel
 * `dvh` keeps mobile address bars from clipping the frame or the quality buttons.
 */
export default function IframeVideoPlayer({ title, aspectRatio, streamSources }: Props) {
  const [activeId, setActiveId] = useState(streamSources[0]?.id);
  const active = streamSources.find((s) => s.id === activeId) ?? streamSources[0];
  const ratio = RATIO_ATTR[aspectRatio];

  if (!active) {
    return <p className="rounded-xl bg-neutral-100 p-6 text-sm text-neutral-500">No playable source for this video.</p>;
  }

  return (
    <div className="yt-player-stage" data-ratio={ratio}>
      <div className="yt-player-frame" data-ratio={ratio}>
        <iframe
          key={active.id} // remount so the new source loads cleanly
          src={active.embedUrl}
          title={title}
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
          allow="accelerometer; autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>

      {streamSources.length > 1 && (
        <div role="radiogroup" aria-label="Video quality" className="yt-quality">
          <span className="yt-quality-label text-xs text-neutral-500">Quality</span>
          {streamSources.map((s) => {
            const selected = s.id === active.id;
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setActiveId(s.id)}
                className={`yt-tap rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  selected
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                    : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                }`}
              >
                {s.quality}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
