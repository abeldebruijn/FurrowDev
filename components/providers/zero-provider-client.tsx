"use client";

import { ZeroProvider } from "@rocicorp/zero/react";
import { useAccessToken } from "@workos-inc/authkit-nextjs/components";

import type { ZeroContext } from "@/lib/zero/context";
import { mutators } from "@/zero/mutators";
import { schema } from "@/zero/schema";

type ZeroProviderClientProps = {
  cacheURL?: string | null;
  children: React.ReactNode;
  zeroContext?: ZeroContext | null;
  userID: string;
};

export function ZeroProviderClient({
  cacheURL,
  children,
  userID,
  zeroContext,
}: ZeroProviderClientProps) {
  const { accessToken, loading } = useAccessToken();
  const zeroConfigured = Boolean(cacheURL && zeroContext);

  if (!zeroConfigured) {
    return <>{children}</>;
  }

  if (loading || !accessToken) {
    return null;
  }

  return (
    <ZeroProvider
      auth={accessToken}
      cacheURL={cacheURL!}
      context={zeroContext!}
      mutators={mutators}
      schema={schema}
      storageKey="furrow-dev"
      userID={userID}
    >
      {children}
    </ZeroProvider>
  );
}
