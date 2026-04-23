import type { NextRequest } from "next/server";

import { generateProjectIdeaTaskTitles } from "@/lib/idea/server";

import {
  getGeneratedTaskErrorResponse,
  getGeneratedTaskRouteContext,
  type GeneratedTaskRouteProps,
} from "../shared";

export async function POST(
  request: NextRequest,
  props: GeneratedTaskRouteProps,
): Promise<Response> {
  const context = await getGeneratedTaskRouteContext(request, props);

  if (context.response) {
    return context.response;
  }

  const result = await generateProjectIdeaTaskTitles(
    context.viewerId,
    context.projectId,
    context.ideaId,
  );
  const errorResponse = getGeneratedTaskErrorResponse(result.error);

  if (errorResponse) {
    return errorResponse;
  }

  return Response.json({ ok: true, tasks: result.tasks });
}
