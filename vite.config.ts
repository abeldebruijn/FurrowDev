import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    ignorePatterns: [".agents/**"],
  },
  lint: {
    ignorePatterns: [".agents/**"],
    options: { typeAware: true, typeCheck: true },
  },
});
