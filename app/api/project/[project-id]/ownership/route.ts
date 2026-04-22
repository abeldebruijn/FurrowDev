import type { NextRequest } from "next/server";
import { z } from "zod";

import { moveProjectOwnership } from "@/lib/project/server";
import { upsertViewerFromWorkOSSession } from "@/lib/zero/context";
import { getWorkOSSession } from "@/lib/workos-session";

type ProjectOwnershipRouteProps = {
  params: Promise<{
    "project-id": string;
  }>;
};

const ownershipSchema = z.object({
  orgOwnerId: z.uuid().nullable(),
});

function getErrorResponse(error: "forbidden" | "invalid_organisation" | "not_found" | null) {
  switch (error) {
    case "forbidden":
      return Response.json(
        { error: "Only the project owner can move project ownership." },
        { status: 403 },
      );
    case "invalid_organisation":
      return Response.json({ error: "Organisation not found." }, { status: 400 });
    case "not_found":
      return Response.json({ error: "Project not found." }, { status: 404 });
    default:
      return null;
  }
}

export async function PATCH(request: NextRequest, { params }: ProjectOwnershipRouteProps) {
  const session = await getWorkOSSession(request);

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const viewer = await upsertViewerFromWorkOSSession(session);
  const { ["project-id"]: projectId } = await params;
  const rawBody = await request.json().catch(() => null);

  if (rawBody === null) {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const body = ownershipSchema.safeParse(rawBody);

  if (!body.success) {
    return Response.json({ error: "Invalid ownership payload." }, { status: 400 });
  }

  const result = await moveProjectOwnership(viewer.id, projectId, body.data.orgOwnerId);
  const errorResponse = getErrorResponse(result.error);

  if (errorResponse) {
    return errorResponse;
  }

  return Response.json({ ok: true });
}
