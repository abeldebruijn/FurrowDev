"use client";

import { useEffect, useState } from "react";

function formatUpdatedAt(isoString: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(isoString));
}

export function VisionUpdatedAt({ isoString }: { isoString: string }) {
  const [formatted, setFormatted] = useState("");

  useEffect(() => {
    setFormatted(formatUpdatedAt(isoString));
  }, [isoString]);

  return (
    <time dateTime={isoString} suppressHydrationWarning>
      {formatted}
    </time>
  );
}
