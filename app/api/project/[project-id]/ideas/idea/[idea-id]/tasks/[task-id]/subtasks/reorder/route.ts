import type { NextRequest } from "next/server";
import { z } from "zod";

import { reorderProjectIdeaSubtasks } from "@/lib/idea/server";
import { upsertViewerFromWorkOSSession } from "@/lib/zero/context";
import { getWorkOSSession } from "@/lib/workos-session";

type ProjectIdeaSubtaskReorderRouteProps = {
  params: Promise<{
    "idea-id": string;
    "project-id": string;
    "task-id": string;
  }>;
};

const reorderSchema = z.object({
  ids: z.array(z.uuid()),
});

function getReorderErrorResponse(error: "invalid_order" | "not_found" | null) {
  switch (error) {
    case "invalid_order":
      return Response.json({ error: "Invalid subtask order." }, { status: 400 });
    case "not_found":
      return Response.json({ error: "Task not found." }, { status: 404 });
    default:
      return null;
  }
}

export async function PATCH(request: NextRequest, { params }: ProjectIdeaSubtaskReorderRouteProps) {
  const session = await getWorkOSSession(request);

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => null);

  if (rawBody === null) {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const body = reorderSchema.safeParse(rawBody);

  if (!body.success) {
    return Response.json({ error: "Invalid subtask order payload." }, { status: 400 });
  }

  const viewer = await upsertViewerFromWorkOSSession(session);
  const { ["idea-id"]: ideaId, ["project-id"]: projectId, ["task-id"]: taskId } = await params;
  const result = await reorderProjectIdeaSubtasks(
    viewer.id,
    projectId,
    ideaId,
    taskId,
    body.data.ids,
  );
  const errorResponse = getReorderErrorResponse(result.error);

  if (errorResponse) {
    return errorResponse;
  }

  return Response.json({ idea: result.idea, ok: true });
}
