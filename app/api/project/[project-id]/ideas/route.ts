import type { NextRequest } from "next/server";
import { z } from "zod";

import { createVision } from "@/lib/vision/server";
import { upsertViewerFromWorkOSSession } from "@/lib/zero/context";
import { getWorkOSSession } from "@/lib/workos-session";

type ProjectIdeasRouteProps = {
  params: Promise<{
    "project-id": string;
  }>;
};

const createVisionSchema = z.object({
  roadmapItemId: z.uuid().optional(),
  title: z.string().trim().max(120).optional(),
});

function getCreateVisionErrorResponse(error: unknown) {
  if (error instanceof Error && error.message === "Roadmap item not found.") {
    return Response.json({ error: error.message }, { status: 400 });
  }

  console.error("Failed to create vision", error);

  return Response.json({ error: "Failed to create vision." }, { status: 500 });
}

export async function POST(request: NextRequest, { params }: ProjectIdeasRouteProps) {
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

  const body = createVisionSchema.safeParse(rawBody);

  if (!body.success) {
    return Response.json({ error: "Invalid vision payload." }, { status: 400 });
  }

  try {
    const visionId = await createVision({
      projectId,
      roadmapItemId: body.data.roadmapItemId,
      title: body.data.title,
      viewerId: viewer.id,
    });

    if (!visionId) {
      return Response.json({ error: "Project not found." }, { status: 404 });
    }

    return Response.json({ id: visionId, ok: true });
  } catch (error) {
    return getCreateVisionErrorResponse(error);
  }
}
