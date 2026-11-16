import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">Video not found</h1>
      <p className="mt-2 text-neutral-500">It may have been removed or made private.</p>
      <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">
        Back to home
      </Link>
    </main>
  );
}
