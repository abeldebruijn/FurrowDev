import type { NextRequest } from "next/server";
import { z } from "zod";

import { getProjectIdeaById, updateProjectIdeaWorkspace } from "@/lib/idea/server";
import { upsertViewerFromWorkOSSession } from "@/lib/zero/context";
import { getWorkOSSession } from "@/lib/workos-session";

type ProjectIdeaRouteProps = {
  params: Promise<{
    "idea-id": string;
    "project-id": string;
  }>;
};

const userStorySchema = z.object({
  id: z.string().trim().min(1),
  outcome: z.string().trim().min(1),
  story: z.string().trim().min(1),
});

const updateIdeaSchema = z
  .object({
    context: z.string().optional(),
    roadmapItemId: z.union([z.uuid(), z.null()]).optional(),
    specSheet: z.string().optional(),
    userStories: z.array(userStorySchema).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Nothing to update",
  });

function getUpdateErrorResponse(
  error: "invalid_roadmap_item" | "invalid_user_stories" | "not_found" | null,
) {
  switch (error) {
    case "invalid_roadmap_item":
      return Response.json({ error: "Roadmap item not found." }, { status: 400 });
    case "invalid_user_stories":
      return Response.json({ error: "Invalid user stories payload." }, { status: 400 });
    case "not_found":
      return Response.json({ error: "Idea not found." }, { status: 404 });
    default:
      return null;
  }
}

export async function GET(request: NextRequest, { params }: ProjectIdeaRouteProps) {
  const session = await getWorkOSSession(request);

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const viewer = await upsertViewerFromWorkOSSession(session);
  const { ["idea-id"]: ideaId, ["project-id"]: projectId } = await params;
  const idea = await getProjectIdeaById(viewer.id, projectId, ideaId);

  if (!idea) {
    return Response.json({ error: "Idea not found." }, { status: 404 });
  }

  return Response.json({ idea, ok: true });
}

export async function PATCH(request: NextRequest, { params }: ProjectIdeaRouteProps) {
  const session = await getWorkOSSession(request);

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const viewer = await upsertViewerFromWorkOSSession(session);
  const { ["idea-id"]: ideaId, ["project-id"]: projectId } = await params;
  const rawBody = await request.json().catch(() => null);

  if (rawBody === null) {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const body = updateIdeaSchema.safeParse(rawBody);

  if (!body.success) {
    return Response.json({ error: "Invalid idea update payload." }, { status: 400 });
  }

  const result = await updateProjectIdeaWorkspace(viewer.id, projectId, ideaId, {
    context: body.data.context,
    roadmapItemId: body.data.roadmapItemId,
    specSheet: body.data.specSheet,
    userStories: body.data.userStories,
  });
  const errorResponse = getUpdateErrorResponse(result.error);

  if (errorResponse) {
    return errorResponse;
  }

  if (!result.idea) {
    return Response.json({ error: "Idea not found." }, { status: 404 });
  }

  return Response.json({ idea: result.idea, ok: true });
}
