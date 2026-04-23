import type { NextRequest } from "next/server";
import { z } from "zod";

import { reorderProjectIdeaTasks } from "@/lib/idea/server";
import { upsertViewerFromWorkOSSession } from "@/lib/zero/context";
import { getWorkOSSession } from "@/lib/workos-session";

type ProjectIdeaTaskReorderRouteProps = {
  params: Promise<{
    "idea-id": string;
    "project-id": string;
  }>;
};

const reorderSchema = z.object({
  ids: z.array(z.uuid()),
});

function getReorderErrorResponse(error: "invalid_order" | "not_found" | null) {
  switch (error) {
    case "invalid_order":
      return Response.json({ error: "Invalid task order." }, { status: 400 });
    case "not_found":
      return Response.json({ error: "Idea not found." }, { status: 404 });
    default:
      return null;
  }
}

export async function PATCH(request: NextRequest, { params }: ProjectIdeaTaskReorderRouteProps) {
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
    return Response.json({ error: "Invalid task order payload." }, { status: 400 });
  }

  const viewer = await upsertViewerFromWorkOSSession(session);
  const { ["idea-id"]: ideaId, ["project-id"]: projectId } = await params;
  const result = await reorderProjectIdeaTasks(viewer.id, projectId, ideaId, body.data.ids);
  const errorResponse = getReorderErrorResponse(result.error);

  if (errorResponse) {
    return errorResponse;
  }

  return Response.json({ idea: result.idea, ok: true });
}
