import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    ignorePatterns: [".agents/**", "drizzle/migrations/**"],
  },
  lint: {
    ignorePatterns: [".agents/**", "drizzle/migrations/**"],
    options: { typeAware: true, typeCheck: true },
  },
});
