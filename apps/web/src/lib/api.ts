import "server-only";
import { cache } from "react";
import type { CategoryCount, VideoCardData, VideoDetail, VideoListResponse } from "@/types";

const API_URL = process.env.API_INTERNAL_URL ?? "http://localhost:4000/api";

/**
 * React `cache` dedupes the call between generateMetadata() and the page
 * component within one request.
 */
export const getVideoBySlug = cache(async (slug: string): Promise<VideoDetail | null> => {
  const res = await fetch(`${API_URL}/videos/${encodeURIComponent(slug)}`, {
    next: { revalidate: 60, tags: [`video:${slug}`] },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load video (${res.status})`);
  return res.json();
});

export async function getVideos(params: { category?: string; q?: string } = {}): Promise<VideoListResponse> {
  const qs = new URLSearchParams({ limit: "24" });
  if (params.category) qs.set("category", params.category);
  if (params.q) qs.set("q", params.q);
  const res = await fetch(`${API_URL}/videos?${qs}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load videos (${res.status})`);
  return res.json();
}

export async function getCategories(): Promise<CategoryCount[]> {
  const res = await fetch(`${API_URL}/videos/categories`, { next: { revalidate: 30 } });
  if (!res.ok) return [];
  return ((await res.json()) as { items: CategoryCount[] }).items;
}

export async function getRelatedVideos(slug: string): Promise<VideoCardData[]> {
  const res = await fetch(`${API_URL}/videos/${encodeURIComponent(slug)}/related`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return [];
  return ((await res.json()) as { items: VideoCardData[] }).items;
}
