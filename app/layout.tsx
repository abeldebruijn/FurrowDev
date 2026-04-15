import type { Metadata } from "next";
import { getTokenClaims, withAuth } from "@workos-inc/authkit-nextjs";
import { AuthKitProvider } from "@workos-inc/authkit-nextjs/components";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { ZeroProviderClient } from "@/components/providers/zero-provider-client";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isDatabaseConnectionError } from "@/lib/db";
import { isZeroEnabled } from "@/lib/zero/config";
import { upsertViewerFromWorkOSUser } from "@/lib/zero/context";
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
  const zeroEnabled = isZeroEnabled();
  const auth = await withAuth();
  const { accessToken, ...initialAuth } = auth;
  const userID = auth.user?.id ?? "anon";
  let viewer = null;

  if (auth.user) {
    try {
      viewer = await upsertViewerFromWorkOSUser(auth.user);
    } catch (error) {
      if (!isDatabaseConnectionError(error)) {
        throw error;
      }
    }
  }

  const claims = accessToken ? await getTokenClaims<TokenClaims>(accessToken) : null;
  const zeroContext =
    auth.user && viewer
      ? {
          viewerId: viewer.id,
          workosUserId: viewer.workosUserId,
          orgId:
            typeof auth.organizationId === "string"
              ? auth.organizationId
              : typeof claims?.org_id === "string"
                ? claims.org_id
                : undefined,
          role:
            typeof auth.role === "string"
              ? auth.role
              : typeof claims?.role === "string"
                ? claims.role
                : undefined,
          roles: auth.roles ?? getStringArray(claims?.roles),
          permissions: auth.permissions ?? getStringArray(claims?.permissions),
        }
      : null;

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-full antialiased">
        <AuthKitProvider initialAuth={initialAuth}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            disableTransitionOnChange
            enableSystem
          >
            <TooltipProvider>
              <ZeroProviderClient
                cacheURL={zeroEnabled ? process.env.NEXT_PUBLIC_ZERO_CACHE_URL : undefined}
                userID={userID}
                zeroContext={zeroEnabled ? zeroContext : null}
              >
                {children}
              </ZeroProviderClient>
              <Toaster />
            </TooltipProvider>
          </ThemeProvider>
        </AuthKitProvider>
      </body>
    </html>
  );
}
