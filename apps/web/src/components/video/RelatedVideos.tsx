import { getRelatedVideos } from "@/lib/api";
import VideoCard from "./VideoCard";

export default async function RelatedVideos({ slug }: { slug: string }) {
  const items = await getRelatedVideos(slug);
  if (items.length === 0) return <p className="text-sm text-neutral-500">No related videos.</p>;
  return (
    <div className="flex flex-col gap-4">
      {items.map((v) => (
        <VideoCard key={v.id} video={v} />
      ))}
    </div>
  );
}
