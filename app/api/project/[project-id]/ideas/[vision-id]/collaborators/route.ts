import type { NextRequest } from "next/server";
import { z } from "zod";

import { addVisionCollaborator, removeVisionCollaborator } from "@/lib/vision/server";
import { upsertViewerFromWorkOSSession } from "@/lib/zero/context";
import { getWorkOSSession } from "@/lib/workos-session";

type VisionCollaboratorsRouteProps = {
  params: Promise<{
    "project-id": string;
    "vision-id": string;
  }>;
};

const collaboratorSchema = z.object({
  userId: z.uuid(),
});

function getErrorResponse(
  error: "forbidden" | "invalid_user" | "not_found" | "owner" | null,
  action: "add" | "remove",
) {
  switch (error) {
    case "forbidden":
      return Response.json(
        { error: "Only the vision owner can manage collaborators." },
        { status: 403 },
      );
    case "invalid_user":
      return Response.json({ error: "User is not eligible for this project." }, { status: 400 });
    case "owner":
      return Response.json(
        {
          error:
            action === "add"
              ? "The vision owner is already a collaborator."
              : "The vision owner cannot be removed.",
        },
        { status: 400 },
      );
    case "not_found":
      return Response.json({ error: "Vision not found." }, { status: 404 });
    default:
      return null;
  }
}

export async function POST(request: NextRequest, { params }: VisionCollaboratorsRouteProps) {
  const session = await getWorkOSSession(request);

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const viewer = await upsertViewerFromWorkOSSession(session);
  const { ["project-id"]: projectId, ["vision-id"]: visionId } = await params;
  const rawBody = await request.json().catch(() => null);

  if (rawBody === null) {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const body = collaboratorSchema.safeParse(rawBody);

  if (!body.success) {
    return Response.json({ error: "Invalid collaborator payload." }, { status: 400 });
  }

  const result = await addVisionCollaborator(viewer.id, projectId, visionId, body.data.userId);
  const errorResponse = getErrorResponse(result.error, "add");

  if (errorResponse) {
    return errorResponse;
  }

  return Response.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: VisionCollaboratorsRouteProps) {
  const session = await getWorkOSSession(request);

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const viewer = await upsertViewerFromWorkOSSession(session);
  const { ["project-id"]: projectId, ["vision-id"]: visionId } = await params;
  const rawBody = await request.json().catch(() => null);

  if (rawBody === null) {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const body = collaboratorSchema.safeParse(rawBody);

  if (!body.success) {
    return Response.json({ error: "Invalid collaborator payload." }, { status: 400 });
  }

  const result = await removeVisionCollaborator(viewer.id, projectId, visionId, body.data.userId);
  const errorResponse = getErrorResponse(result.error, "remove");

  if (errorResponse) {
    return errorResponse;
  }

  return Response.json({ ok: true });
}
