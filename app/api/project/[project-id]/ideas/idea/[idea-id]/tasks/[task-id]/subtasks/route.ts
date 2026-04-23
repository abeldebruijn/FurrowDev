import type { NextRequest } from "next/server";
import { z } from "zod";

import { createProjectIdeaSubtask } from "@/lib/idea/server";
import { upsertViewerFromWorkOSSession } from "@/lib/zero/context";
import { getWorkOSSession } from "@/lib/workos-session";

type ProjectIdeaSubtasksRouteProps = {
  params: Promise<{
    "idea-id": string;
    "project-id": string;
    "task-id": string;
  }>;
};

const metadataSchema = z.record(z.string(), z.unknown());

const createSubtaskSchema = z.object({
  completed: z.boolean().optional(),
  dependencies: z.array(z.uuid()).optional(),
  description: z.string().optional(),
  metadata: metadataSchema.optional(),
  position: z.int().min(0).optional(),
  title: z.string().trim().min(1),
});

function getSubtaskErrorResponse(
  error: "invalid_dependency" | "invalid_metadata" | "not_found" | null,
) {
  switch (error) {
    case "invalid_dependency":
      return Response.json({ error: "Invalid subtask dependency." }, { status: 400 });
    case "invalid_metadata":
      return Response.json({ error: "Invalid subtask metadata." }, { status: 400 });
    case "not_found":
      return Response.json({ error: "Task not found." }, { status: 404 });
    default:
      return null;
  }
}

export async function POST(request: NextRequest, { params }: ProjectIdeaSubtasksRouteProps) {
  const session = await getWorkOSSession(request);

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => null);

  if (rawBody === null) {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const body = createSubtaskSchema.safeParse(rawBody);

  if (!body.success) {
    return Response.json({ error: "Invalid subtask payload." }, { status: 400 });
  }

  const viewer = await upsertViewerFromWorkOSSession(session);
  const { ["idea-id"]: ideaId, ["project-id"]: projectId, ["task-id"]: taskId } = await params;
  const result = await createProjectIdeaSubtask(viewer.id, projectId, ideaId, taskId, body.data);
  const errorResponse = getSubtaskErrorResponse(result.error);

  if (errorResponse) {
    return errorResponse;
  }

  return Response.json({ idea: result.idea, ok: true });
}
