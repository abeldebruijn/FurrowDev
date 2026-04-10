import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const outputPath = resolve(process.cwd(), "zero/schema.gen.ts");
const fileContents = `import { createBuilder } from "@rocicorp/zero";
import { drizzleZeroConfig } from "drizzle-zero";

import { zeroDrizzleSchema } from "@/drizzle/schema";

export const schema = drizzleZeroConfig(zeroDrizzleSchema, {
  suppressDefaultsWarning: true,
});
export const zql = createBuilder(schema);

export type AppZeroSchema = typeof schema;
`;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, fileContents, "utf8");
