"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

// react-markdown never renders raw HTML, which matters because the body quotes public advisory text.
export function PrCard({ title, body, url }: { title: string; body: string; url: string | null }) {
  return (
    <article className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
      <header className="flex flex-wrap items-center gap-3 border-b border-zinc-800 px-5 py-4">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${url ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-400/15 text-amber-200"}`}
        >
          {url ? "Opened on GitHub" : "Dry run: not opened"}
        </span>
        <h3 className="font-mono text-sm text-zinc-100">{title}</h3>
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="ml-auto text-sm text-amber-300 hover:underline">
            View pull request →
          </a>
        ) : null}
      </header>
      <div className="px-5 py-4 text-sm leading-relaxed text-zinc-300">
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
            h2: (p) => <h4 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-widest text-zinc-500 first:mt-0" {...p} />,
            p: (p) => <p className="my-2" {...p} />,
            ul: (p) => <ul className="my-2 list-disc space-y-1 pl-5" {...p} />,
            code: (p) => <code className="rounded bg-zinc-800 px-1 py-0.5 font-mono text-[0.85em] text-amber-200" {...p} />,
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-amber-300 hover:underline">
                {children}
              </a>
            ),
            hr: () => <hr className="my-4 border-zinc-800" />,
            strong: (p) => <strong className="font-semibold text-zinc-100" {...p} />,
          }}
        >
          {body}
        </Markdown>
      </div>
    </article>
  );
}
