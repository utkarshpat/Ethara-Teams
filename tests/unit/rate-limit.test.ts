import { beforeEach, describe, expect, it } from "vitest";
import { AppError } from "@/lib/guards";
import { clearRateLimitBuckets, enforceRateLimit } from "@/lib/rate-limit";

describe("rate limiter", () => {
  beforeEach(() => {
    clearRateLimitBuckets();
  });

  it("allows requests within the configured window", () => {
    const request = new Request("https://ethara.test/api/tasks");

    expect(() =>
      enforceRateLimit(request, {
        scope: "tasks:create",
        userId: "user-1",
        limit: 2,
        windowMs: 60_000,
      }),
    ).not.toThrow();
  });

  it("blocks repeated writes for the same user and scope", () => {
    const request = new Request("https://ethara.test/api/tasks");
    const options = {
      scope: "comments:create",
      userId: "user-1",
      limit: 1,
      windowMs: 60_000,
    };

    enforceRateLimit(request, options);

    expect(() => enforceRateLimit(request, options)).toThrow(AppError);
    expect(() => enforceRateLimit(request, options)).toThrow(
      "Too many requests. Please slow down.",
    );
  });

  it("isolates counters by scope", () => {
    const request = new Request("https://ethara.test/api/tasks");

    enforceRateLimit(request, {
      scope: "comments:create",
      userId: "user-1",
      limit: 1,
      windowMs: 60_000,
    });

    expect(() =>
      enforceRateLimit(request, {
        scope: "project-messages:create",
        userId: "user-1",
        limit: 1,
        windowMs: 60_000,
      }),
    ).not.toThrow();
  });
});
