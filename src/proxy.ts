import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export function proxy(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  logger.info("request.received", {
    requestId,
    method: request.method,
    path: request.nextUrl.pathname,
  });

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|sw.js).*)"],
};
