import type { NextRequest } from "next/server";
import { z } from "zod";

import { generateProjectIdeaTaskDetails } from "@/lib/idea/server";

import {
  generatedTaskTitleSchema,
  getGeneratedTaskErrorResponse,
  getGeneratedTaskRouteContext,
  type GeneratedTaskRouteProps,
} from "../shared";

const detailsSchema = z.object({
  tasks: z.array(generatedTaskTitleSchema).min(1).max(20),
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

  const body = detailsSchema.safeParse(rawBody);

  if (!body.success) {
    return Response.json({ error: "Invalid generated task payload." }, { status: 400 });
  }

  const result = await generateProjectIdeaTaskDetails(
    context.viewerId,
    context.projectId,
    context.ideaId,
    body.data.tasks,
  );
  const errorResponse = getGeneratedTaskErrorResponse(result.error);

  if (errorResponse) {
    return errorResponse;
  }

  return Response.json({ ok: true, tasks: result.tasks });
}
