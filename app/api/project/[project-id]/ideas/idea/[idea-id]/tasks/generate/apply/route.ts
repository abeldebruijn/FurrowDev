import type { NextRequest } from "next/server";
import { z } from "zod";

import { applyGeneratedProjectIdeaTasks } from "@/lib/idea/server";

import {
  generatedTaskDraftSchema,
  getGeneratedTaskErrorResponse,
  getGeneratedTaskRouteContext,
  type GeneratedTaskRouteProps,
} from "../shared";

const applySchema = z.object({
  mode: z.enum(["append", "replace_all", "replace_empty"]),
  tasks: z.array(generatedTaskDraftSchema).min(1).max(20),
});

export async function POST(
  request: NextRequest,
  props: GeneratedTaskRouteProps,
): Promise<Response> {
  const context = await getGeneratedTaskRouteContext(request, props);

  if (context.response) {
    return context.response;
  }

  const rawBody = await request.json().catch(() => null);

  if (rawBody === null) {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const body = applySchema.safeParse(rawBody);

  if (!body.success) {
    return Response.json({ error: "Invalid generated task payload." }, { status: 400 });
  }

  const result = await applyGeneratedProjectIdeaTasks(
    context.viewerId,
    context.projectId,
    context.ideaId,
    body.data.tasks,
    body.data.mode,
  );
  const errorResponse = getGeneratedTaskErrorResponse(result.error);

  if (errorResponse) {
    return errorResponse;
  }

  return Response.json({ idea: result.idea, ok: true });
}
