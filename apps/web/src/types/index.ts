export type AspectRatio = "RATIO_16_9" | "RATIO_9_16" | "RATIO_4_3" | "RATIO_1_1";

export interface Creator {
  username: string;
  handle: string;
  avatarUrl: string;
}

export interface StreamSource {
  id: string;
  quality: string;
  embedUrl: string;
}

export interface VideoCardData {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl: string;
  aspectRatio: AspectRatio;
  category: string;
  views: number;
  likes: number;
  createdAt: string;
  creator: Creator;
}

export interface VideoDetail extends VideoCardData {
  description: string;
  tags: string[];
  updatedAt: string;
  streamSources: StreamSource[];
}

export interface VideoListResponse {
  items: VideoCardData[];
  nextCursor: string | null;
}

export interface CategoryCount {
  category: string;
  count: number;
}
