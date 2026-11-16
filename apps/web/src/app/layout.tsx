import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import "../styles/responsive-player.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "YourTube", template: "%s | YourTube" },
  description: "Discover and share embeddable videos on YourTube.",
};

// viewport-fit=cover lets the layout use env(safe-area-inset-*) on notched phones.
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="yt-site-header sticky top-0 z-10 flex items-center gap-4 border-b border-neutral-200 bg-white/90 pb-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90">
          <Link href="/" className="yt-tap text-lg font-bold text-red-600">
            YourTube
          </Link>
          {/* Plain GET form: works without JS and is server-rendered at /?q= */}
          <form action="/" method="get" role="search" className="mx-auto flex w-full max-w-xl">
            <input
              type="search"
              name="q"
              maxLength={100}
              placeholder="Search videos"
              aria-label="Search videos"
              className="yt-tap w-full min-w-0 rounded-l-full border border-neutral-300 bg-transparent px-4 py-1.5 text-sm outline-none focus:border-blue-500 dark:border-neutral-700"
            />
            <button
              type="submit"
              className="yt-tap rounded-r-full border border-l-0 border-neutral-300 bg-neutral-100 px-4 text-sm hover:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
            >
              Search
            </button>
          </form>
          <Link
            href="/submit"
            className="yt-tap shrink-0 rounded-full bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-300"
          >
            Submit
          </Link>
        </header>
        {children}
      </body>
    </html>
  );
}
