import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-5 pt-24">
      <h1 className="text-2xl font-semibold">Nothing here</h1>
      <p className="text-zinc-400">That run or page does not exist.</p>
      <Link href="/demo" className="text-amber-300 hover:underline">
        Start a run on the live demo →
      </Link>
    </main>
  );
}
