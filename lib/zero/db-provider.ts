import { zeroDrizzle } from "@rocicorp/zero/server/adapters/drizzle";

import { getDb } from "@/lib/db";
import { schema } from "@/zero/schema";

let dbProvider: ReturnType<typeof zeroDrizzle<typeof schema, ReturnType<typeof getDb>>> | undefined;

export function getZeroDbProvider() {
  if (!dbProvider) {
    dbProvider = zeroDrizzle(schema, getDb());
  }

  return dbProvider;
}
