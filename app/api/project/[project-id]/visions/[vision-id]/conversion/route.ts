import type { NextRequest } from "next/server";

import { getIdeaBySourceVision } from "@/lib/idea/server";
import { upsertViewerFromWorkOSSession } from "@/lib/zero/context";
import { getWorkOSSession } from "@/lib/workos-session";

type VisionConversionRouteProps = {
  params: Promise<{
    "project-id": string;
    "vision-id": string;
  }>;
};

export async function GET(request: NextRequest, { params }: VisionConversionRouteProps) {
  const session = await getWorkOSSession(request);

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const viewer = await upsertViewerFromWorkOSSession(session);
  const { ["project-id"]: projectId, ["vision-id"]: visionId } = await params;
  const idea = await getIdeaBySourceVision(viewer.id, projectId, visionId);

  return Response.json({
    converted: Boolean(idea),
    id: idea?.id ?? null,
    ok: true,
  });
}
