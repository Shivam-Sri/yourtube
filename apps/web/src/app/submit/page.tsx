"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const CATEGORIES = ["Tech", "Music", "Gaming", "Education", "Entertainment", "News", "Sports", "Lifestyle", "Other"];
const QUALITIES = ["2160p", "1440p", "1080p", "720p", "480p", "360p", "Auto"];
const RATIOS = ["16:9", "9:16", "4:3", "1:1"];

interface Row {
  key: number;
  quality: string;
  embedUrl: string;
}
interface Issue {
  path: string;
  message: string;
}

const input =
  "w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700";
const label = "mb-1 block text-sm font-medium";

export default function SubmitPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([{ key: 1, quality: "1080p", embedUrl: "" }]);
  const [nextKey, setNextKey] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);

  const updateRow = (key: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const addRow = () => {
    const used = new Set(rows.map((r) => r.quality));
    const quality = QUALITIES.find((q) => !used.has(q));
    if (!quality) return;
    setRows((rs) => [...rs, { key: nextKey, quality, embedUrl: "" }]);
    setNextKey((k) => k + 1);
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIssues([]);
    const f = new FormData(e.currentTarget);
    const body = {
      title: String(f.get("title") ?? ""),
      description: String(f.get("description") ?? ""),
      thumbnailUrl: String(f.get("thumbnailUrl") ?? ""),
      aspectRatio: String(f.get("aspectRatio")),
      category: String(f.get("category")),
      tags: String(f.get("tags") ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      streamSources: rows.map(({ quality, embedUrl }) => ({ quality, embedUrl: embedUrl.trim() })),
    };

    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/videos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        router.push(`/watch/${data.slug}`);
        return;
      }
      setError(data.error ?? `Request failed (${res.status})`);
      setIssues(data.issues ?? []);
    } catch {
      setError("Could not reach the API.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Submit a video</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Add an embeddable link (YouTube, Vimeo, Dailymotion, Google Drive&hellip;). Nothing is uploaded or hosted here.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <div>
          <label htmlFor="title" className={label}>Title</label>
          <input id="title" name="title" required minLength={3} maxLength={120} className={input} />
        </div>

        <div>
          <label htmlFor="thumbnailUrl" className={label}>Thumbnail URL</label>
          <input id="thumbnailUrl" name="thumbnailUrl" type="url" required placeholder="https://i.ytimg.com/vi/…/hqdefault.jpg" className={input} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="aspectRatio" className={label}>Aspect ratio</label>
            <select id="aspectRatio" name="aspectRatio" defaultValue="16:9" className={input}>
              {RATIOS.map((r) => (
                <option key={r} value={r}>{r}{r === "9:16" ? " (vertical / short)" : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="category" className={label}>Category</label>
            <select id="category" name="category" defaultValue="Other" className={input}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="description" className={label}>Description</label>
          <textarea id="description" name="description" rows={4} maxLength={5000} className={input} />
        </div>

        <div>
          <label htmlFor="tags" className={label}>Tags (comma separated)</label>
          <input id="tags" name="tags" placeholder="animation, blender" className={input} />
        </div>

        <fieldset>
          <legend className={label}>Sources (quality + embed URL)</legend>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={r.key} className="flex gap-2">
                <select
                  aria-label={`Quality ${i + 1}`}
                  value={r.quality}
                  onChange={(e) => updateRow(r.key, { quality: e.target.value })}
                  className={`${input} w-28 shrink-0`}
                >
                  {QUALITIES.map((q) => (
                    <option key={q}>{q}</option>
                  ))}
                </select>
                <input
                  aria-label={`Embed URL ${i + 1}`}
                  type="url"
                  required
                  value={r.embedUrl}
                  onChange={(e) => updateRow(r.key, { embedUrl: e.target.value })}
                  placeholder="https://www.youtube-nocookie.com/embed/VIDEO_ID"
                  className={input}
                />
                <button
                  type="button"
                  disabled={rows.length === 1}
                  onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                  aria-label={`Remove source ${i + 1}`}
                  className="shrink-0 rounded-lg border border-neutral-300 px-3 text-sm hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addRow}
            disabled={rows.length >= QUALITIES.length}
            className="mt-2 text-sm text-blue-600 hover:underline disabled:opacity-40"
          >
            + Add another quality
          </button>
        </fieldset>

        {error && (
          <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            <p className="font-medium">{error}</p>
            {issues.length > 0 && (
              <ul className="mt-1 list-disc pl-5">
                {issues.map((i, n) => (
                  <li key={n}>
                    {i.path && <code>{i.path}</code>}: {i.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {busy ? "Submitting…" : "Submit video"}
          </button>
          <Link href="/" className="text-sm text-neutral-500 hover:underline">Cancel</Link>
        </div>
      </form>
    </main>
  );
}
