"use client";

import { ZeroProvider } from "@rocicorp/zero/react";

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
  if (!cacheURL || !zeroContext) {
    return <>{children}</>;
  }

  return (
    <ZeroProvider
      cacheURL={cacheURL}
      context={zeroContext}
      mutators={mutators}
      schema={schema}
      storageKey="furrow-dev"
      userID={userID}
    >
      {children}
    </ZeroProvider>
  );
}
