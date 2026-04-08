import { mustGetQuery } from "@rocicorp/zero";
import { handleQueryRequest } from "@rocicorp/zero/server";
import type { NextRequest } from "next/server";

import { getZeroContext } from "@/lib/zero/context";
import { queries } from "@/zero/queries";
import { schema } from "@/zero/schema";

export async function POST(request: NextRequest) {
  const ctx = await getZeroContext(request);

  if (!ctx) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await handleQueryRequest(
    (name, args) => {
      const query = mustGetQuery(queries, name);

      return query.fn({ args, ctx });
    },
    schema,
    request,
  );

  return Response.json(result);
}
