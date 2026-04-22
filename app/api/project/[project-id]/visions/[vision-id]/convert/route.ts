import type { NextRequest } from "next/server";
import { z } from "zod";

import { convertVisionToIdea } from "@/lib/idea/server";
import { upsertViewerFromWorkOSSession } from "@/lib/zero/context";
import { getWorkOSSession } from "@/lib/workos-session";

type VisionConvertRouteProps = {
  params: Promise<{
    "project-id": string;
    "vision-id": string;
  }>;
};

const convertVisionSchema = z.object({
  roadmapItemId: z.uuid().optional(),
  title: z.string().trim().max(120).optional(),
});

function getConversionErrorResponse(
  error: "forbidden" | "invalid_roadmap_item" | "not_found" | null,
) {
  switch (error) {
    case "forbidden":
      return Response.json(
        { error: "Only project owners, maintainers, and admins can create ideas." },
        { status: 403 },
      );
    case "invalid_roadmap_item":
      return Response.json({ error: "Roadmap item not found." }, { status: 400 });
    case "not_found":
      return Response.json({ error: "Vision not found." }, { status: 404 });
    default:
      return null;
  }
}

export async function POST(request: NextRequest, { params }: VisionConvertRouteProps) {
  const session = await getWorkOSSession(request);

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const viewer = await upsertViewerFromWorkOSSession(session);
  const { ["project-id"]: projectId, ["vision-id"]: visionId } = await params;
  const rawText = await request.text();
  let rawBody: unknown = {};

  if (rawText.trim().length > 0) {
    try {
      rawBody = JSON.parse(rawText);
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }
  }

  const body = convertVisionSchema.safeParse(rawBody);

  if (!body.success) {
    return Response.json({ error: "Invalid idea conversion payload." }, { status: 400 });
  }

  const result = await convertVisionToIdea(viewer.id, projectId, visionId, {
    roadmapItemId: body.data.roadmapItemId,
    title: body.data.title,
  });
  const errorResponse = getConversionErrorResponse(result.error);

  if (errorResponse) {
    return errorResponse;
  }

  if (!result.idea) {
    return Response.json({ error: "Vision not found." }, { status: 404 });
  }

  return Response.json({ id: result.idea.id, ok: true });
}
