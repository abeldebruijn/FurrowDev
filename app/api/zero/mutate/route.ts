import { mustGetMutator } from "@rocicorp/zero";
import { handleMutateRequest } from "@rocicorp/zero/server";
import type { NextRequest } from "next/server";

import { getZeroDbProvider } from "@/lib/zero/db-provider";
import { getZeroContext } from "@/lib/zero/context";
import { mutators } from "@/zero/mutators";

export async function POST(request: NextRequest) {
  const ctx = await getZeroContext(request);

  if (!ctx) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await handleMutateRequest(
    getZeroDbProvider(),
    async (transact) =>
      transact(async (tx, name, args) => {
        const mutator = mustGetMutator(mutators, name);

        await mutator.fn({ tx: tx as any, ctx, args: args as any });
      }),
    request,
  );

  return Response.json(result);
}
