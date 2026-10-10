import { videoEmbed } from "@/lib/video";

export function Video() {
  const src = videoEmbed(process.env.NEXT_PUBLIC_VIDEO_URL);
  if (!src) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 text-sm text-zinc-500">
        The three-minute demo video goes here.
      </div>
    );
  }
  return (
    <div className="aspect-video overflow-hidden rounded-2xl border border-zinc-800 bg-black">
      <iframe
        src={src}
        title="Jingang demo video"
        className="h-full w-full"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
        loading="lazy"
        allowFullScreen
      />
    </div>
  );
}
