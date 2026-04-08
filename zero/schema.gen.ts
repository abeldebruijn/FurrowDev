import { createBuilder } from "@rocicorp/zero";
import { drizzleZeroConfig } from "drizzle-zero";

import { zeroDrizzleSchema } from "@/drizzle/schema";

export const schema = drizzleZeroConfig(zeroDrizzleSchema, {
  suppressDefaultsWarning: true,
});
export const zql = createBuilder(schema);

export type AppZeroSchema = typeof schema;
