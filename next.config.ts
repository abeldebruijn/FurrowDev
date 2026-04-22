import type { NextConfig } from "next";
import { withPostHogConfig } from "@posthog/nextjs-config";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/array/:path*",
        destination: "https://eu-assets.i.posthog.com/array/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
    ];
  },
  skipTrailingSlashRedirect: true,
};

export default withPostHogConfig(nextConfig, {
  personalApiKey: process.env.PERSONAL_POSTHOG_API_KEY!, // Your personal API key from PostHog settings
  envId: "164148", // Your environment ID (project ID)
  host: "https://eu.i.posthog.com", // Optional: Your PostHog instance URL, defaults to https://us.posthog.com
  sourcemaps: {
    // Optional
    enabled: true, // Optional: Enable sourcemaps generation and upload, defaults to true on production builds
    project: "my-application", // Optional: Project name, defaults to git repository name
    version: "1.0.0", // Optional: Release version, defaults to current git commit
    deleteAfterUpload: true, // Optional: Delete sourcemaps after upload, defaults to true
  },
});
