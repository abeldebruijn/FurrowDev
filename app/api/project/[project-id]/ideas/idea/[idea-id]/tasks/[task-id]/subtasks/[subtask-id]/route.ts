import type { NextRequest } from "next/server";
import { z } from "zod";

import { deleteProjectIdeaSubtask, updateProjectIdeaSubtask } from "@/lib/idea/server";
import { upsertViewerFromWorkOSSession } from "@/lib/zero/context";
import { getWorkOSSession } from "@/lib/workos-session";

type ProjectIdeaSubtaskRouteProps = {
  params: Promise<{
    "idea-id": string;
    "project-id": string;
    "subtask-id": string;
    "task-id": string;
  }>;
};

const metadataSchema = z.record(z.string(), z.unknown());

const subtaskPatchSchema = z
  .object({
    completed: z.boolean().optional(),
    dependencies: z.array(z.uuid()).optional(),
    description: z.string().optional(),
    metadata: metadataSchema.optional(),
    position: z.int().min(0).optional(),
    title: z.string().trim().min(1).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Nothing to update",
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
      return Response.json({ error: "SubTask not found." }, { status: 404 });
    default:
      return null;
  }
}

export async function PATCH(request: NextRequest, { params }: ProjectIdeaSubtaskRouteProps) {
  const session = await getWorkOSSession(request);

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => null);

  if (rawBody === null) {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const body = subtaskPatchSchema.safeParse(rawBody);

  if (!body.success) {
    return Response.json({ error: "Invalid subtask payload." }, { status: 400 });
  }

  const viewer = await upsertViewerFromWorkOSSession(session);
  const {
    ["idea-id"]: ideaId,
    ["project-id"]: projectId,
    ["subtask-id"]: subtaskId,
    ["task-id"]: taskId,
  } = await params;
  const result = await updateProjectIdeaSubtask(
    viewer.id,
    projectId,
    ideaId,
    taskId,
    subtaskId,
    body.data,
  );
  const errorResponse = getSubtaskErrorResponse(result.error);

  if (errorResponse) {
    return errorResponse;
  }

  return Response.json({ idea: result.idea, ok: true });
}

export async function DELETE(request: NextRequest, { params }: ProjectIdeaSubtaskRouteProps) {
  const session = await getWorkOSSession(request);

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const viewer = await upsertViewerFromWorkOSSession(session);
  const {
    ["idea-id"]: ideaId,
    ["project-id"]: projectId,
    ["subtask-id"]: subtaskId,
    ["task-id"]: taskId,
  } = await params;
  const result = await deleteProjectIdeaSubtask(viewer.id, projectId, ideaId, taskId, subtaskId);
  const errorResponse = getSubtaskErrorResponse(result.error);

  if (errorResponse) {
    return errorResponse;
  }

  return Response.json({ idea: result.idea, ok: true });
}
