"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

type PostHogIdentifyProps = {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  viewerId: string;
};

export function PostHogIdentify({ email, firstName, lastName, viewerId }: PostHogIdentifyProps) {
  useEffect(() => {
    posthog.identify(viewerId, {
      email: email ?? undefined,
      name: [firstName, lastName].filter(Boolean).join(" ") || undefined,
    });
  }, [viewerId, email, firstName, lastName]);

  return null;
}
