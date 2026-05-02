import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite-plus";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    exclude: ["**/node_modules/**", "**/dist/**", "test/integration/**"],
  },
  fmt: {
    ignorePatterns: [".agents/**", "drizzle/migrations/**"],
  },
  lint: {
    ignorePatterns: [".agents/**", "drizzle/migrations/**"],
    options: { typeAware: true, typeCheck: true },
  },
  staged: {
    "*.{js,jsx,ts,tsx,mjs,mts,cjs,cts,json,md,css}": "vp fmt --write",
  },
});
