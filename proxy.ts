import { authkitMiddleware } from "@workos-inc/authkit-nextjs";
import type { NextFetchEvent, NextRequest } from "next/server";

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  return authkitMiddleware({
    redirectUri:
      process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI ??
      new URL("/auth/callback", request.url).toString(),
    middlewareAuth: {
      enabled: true,
      unauthenticatedPaths: ["/auth/callback", "/login", "/sign-up"],
    },
  })(request, event);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
