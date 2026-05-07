import { AppError } from "@/lib/guards";
import { logger } from "@/lib/logger";

type RateLimitOptions = {
  limit: number;
  windowMs: number;
  scope: string;
  userId?: string;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

function clientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

function touchBucket(key: string, options: { limit: number; windowMs: number; scope: string }) {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return;
  }

  if (current.count >= options.limit) {
    logger.warn("rate_limit.blocked", {
      scope: options.scope,
      actor: key,
      resetAt: new Date(current.resetAt).toISOString(),
    });
    throw new AppError("Too many requests. Please slow down.", 429);
  }

  current.count += 1;
}

export function clearRateLimitBuckets() {
  buckets.clear();
}

export function enforceRateLimit(request: Request, options: RateLimitOptions) {
  const actor = options.userId ?? clientIp(request);
  const key = `${options.scope}:${actor}`;
  touchBucket(key, options);
}

export function enforceActorRateLimit(
  actor: string,
  options: Pick<RateLimitOptions, "limit" | "windowMs" | "scope">,
) {
  touchBucket(`${options.scope}:${actor}`, options);
}
