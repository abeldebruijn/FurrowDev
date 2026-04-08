"use client";

import { useEffect, useState } from "react";
import { ZeroProvider } from "@rocicorp/zero/react";

import { mutators } from "@/zero/mutators";
import { schema } from "@/zero/schema";

type ZeroProviderClientProps = {
  cacheURL?: string | null;
  children: React.ReactNode;
  userID: string;
};

export function ZeroProviderClient({ cacheURL, children, userID }: ZeroProviderClientProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !cacheURL) {
    return <>{children}</>;
  }

  return (
    <ZeroProvider
      cacheURL={cacheURL}
      mutators={mutators}
      schema={schema}
      storageKey="furrow-dev"
      userID={userID}
    >
      {children}
    </ZeroProvider>
  );
}
