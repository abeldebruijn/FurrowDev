import { defineConfig } from "vite-plus";

export default defineConfig({
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
