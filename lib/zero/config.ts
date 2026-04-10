export function isZeroEnabled() {
  return (
    process.env.NEXT_PUBLIC_ZERO_ENABLED === "true" &&
    Boolean(process.env.NEXT_PUBLIC_ZERO_CACHE_URL)
  );
}
