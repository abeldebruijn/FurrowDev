import type { Metadata } from "next";

import { CSSStudio } from "@/components/providers/css-studio";
import { ZeroProviderClient } from "@/components/providers/zero-provider-client";
import { getWorkOSSession } from "@/lib/workos-session";
import "./globals.css";

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

  return (
    <html lang="en" className="h-full">
      <body className="min-h-full antialiased">
        <ZeroProviderClient cacheURL={process.env.NEXT_PUBLIC_ZERO_CACHE_URL} userID={userID}>
          <CSSStudio />
          {children}
        </ZeroProviderClient>
      </body>
    </html>
  );
}
