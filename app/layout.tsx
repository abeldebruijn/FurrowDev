import type { Metadata } from "next";
import { getTokenClaims } from "@workos-inc/authkit-nextjs";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { ZeroProviderClient } from "@/components/providers/zero-provider-client";
import { Toaster } from "@/components/ui/sonner";
import { upsertViewerFromWorkOSSession } from "@/lib/zero/context";
import { getWorkOSSession } from "@/lib/workos-session";
import "./globals.css";

type TokenClaims = {
  org_id?: unknown;
  role?: unknown;
  roles?: unknown;
  permissions?: unknown;
};

function getStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

export const metadata: Metadata = {
  title: "FurrowDev",
  description: "WorkOS auth dashboard",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getWorkOSSession();
  const userID = session?.user.id ?? "anon";
  const viewer = session ? await upsertViewerFromWorkOSSession(session) : null;
  const claims = session ? await getTokenClaims<TokenClaims>(session.accessToken) : null;
  const zeroContext =
    session && viewer
      ? {
          viewerId: viewer.id,
          workosUserId: viewer.workosUserId,
          orgId: typeof claims?.org_id === "string" ? claims.org_id : undefined,
          role: typeof claims?.role === "string" ? claims.role : undefined,
          roles: getStringArray(claims?.roles),
          permissions: getStringArray(claims?.permissions),
        }
      : null;

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-full antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange enableSystem>
          <ZeroProviderClient
            cacheURL={process.env.NEXT_PUBLIC_ZERO_CACHE_URL}
            userID={userID}
            zeroContext={zeroContext}
          >
            {children}
          </ZeroProviderClient>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
