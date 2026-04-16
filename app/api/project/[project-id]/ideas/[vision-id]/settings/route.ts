import type { NextRequest } from "next/server";
import { z } from "zod";

import {
  archiveAccessibleVision,
  deleteAccessibleVision,
  updateAccessibleVision,
} from "@/lib/vision/server";
import { upsertViewerFromWorkOSSession } from "@/lib/zero/context";
import { getWorkOSSession } from "@/lib/workos-session";

type VisionSettingsRouteProps = {
  params: Promise<{
    "project-id": string;
    "vision-id": string;
  }>;
};

const updateSchema = z
  .object({
    archive: z.literal(true).optional(),
    title: z.string().trim().min(1).max(120).optional(),
  })
  .refine((value) => value.archive === true || value.title !== undefined, {
    message: "Nothing to update",
  });

function getErrorResponse(error: "forbidden" | "not_found" | null) {
  switch (error) {
    case "forbidden":
      return Response.json(
        { error: "Only the vision owner can change vision settings." },
        { status: 403 },
      );
    case "not_found":
      return Response.json({ error: "Vision not found." }, { status: 404 });
    default:
      return null;
  }
}

export async function PATCH(request: NextRequest, { params }: VisionSettingsRouteProps) {
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

  const body = updateSchema.safeParse(rawBody);

  if (!body.success) {
    return Response.json({ error: "Invalid vision update." }, { status: 400 });
  }

  const result =
    body.data.archive === true
      ? await archiveAccessibleVision(viewer.id, projectId, visionId)
      : await updateAccessibleVision(viewer.id, projectId, visionId, {
          title: body.data.title,
        });
  const errorResponse = getErrorResponse(result.error);

  if (errorResponse) {
    return errorResponse;
  }

  return Response.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: VisionSettingsRouteProps) {
  const session = await getWorkOSSession(_request);

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const viewer = await upsertViewerFromWorkOSSession(session);
  const { ["project-id"]: projectId, ["vision-id"]: visionId } = await params;
  const result = await deleteAccessibleVision(viewer.id, projectId, visionId);
  const errorResponse = getErrorResponse(result.error);

  if (errorResponse) {
    return errorResponse;
  }

  return Response.json({ ok: true });
}
