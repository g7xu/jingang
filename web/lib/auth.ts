import { createHash, timingSafeEqual } from "node:crypto";

// Hashing first gives equal-length buffers, so the comparison time says nothing about the secret.
function same(given: string | null, expected: string | undefined) {
  if (!given || !expected) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export const isOwner = (req: Request) => same(req.headers.get("x-jingang-secret"), process.env.RUN_SECRET);

export const isCron = (req: Request) =>
  same(req.headers.get("authorization"), process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : undefined);
