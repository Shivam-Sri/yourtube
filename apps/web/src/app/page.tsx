import Link from "next/link";
import { getCategories, getVideos } from "@/lib/api";
import VideoCard from "@/components/video/VideoCard";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ category?: string; q?: string }> };

export default async function HomePage({ searchParams }: Props) {
  const sp = await searchParams;
  const category = typeof sp.category === "string" ? sp.category : undefined;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";

  const [{ items }, categories] = await Promise.all([getVideos({ category, q }), getCategories()]);

  const href = (cat?: string) => {
    const qs = new URLSearchParams();
    if (cat) qs.set("category", cat);
    if (q) qs.set("q", q);
    const s = qs.toString();
    return s ? `/?${s}` : "/";
  };
  const pill = (active: boolean) =>
    `yt-tap whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
      active
        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
        : "bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
    }`;

  return (
    <main className="yt-page">
      <nav aria-label="Categories" className="mb-6 flex gap-2 overflow-x-auto pb-1">
        <Link href={href()} className={pill(!category)}>
          All
        </Link>
        {categories.map((c) => (
          <Link key={c.category} href={href(c.category)} className={pill(category === c.category)}>
            {c.category}
          </Link>
        ))}
      </nav>

      {q && (
        <p className="mb-4 text-sm text-neutral-500">
          Results for <strong>&ldquo;{q}&rdquo;</strong>
          {category ? ` in ${category}` : ""}
        </p>
      )}

      {items.length === 0 ? (
        <p className="text-neutral-500">
          {q || category ? "No videos match your search." : "No videos yet. Run npm run seed -w apps/api."}
        </p>
      ) : (
        <div className="yt-feed-grid">
          {items.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      )}
    </main>
  );
}
