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

/**
 * Map a canonical update error code to an HTTP error Response or return `null`.
 *
 * @param error - One of `"invalid_roadmap_item"`, `"invalid_user_stories"`, `"not_found"`, or `null`
 * @returns An HTTP `Response` containing a JSON error message and appropriate status code, or `null` if `error` is `null` or unrecognized
 */
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

/**
 * Handle GET requests for a single project idea and return the idea if found.
 *
 * @param params - A Promise resolving to route parameters containing `"idea-id"` and `"project-id"` strings.
 * @returns A Response whose JSON is `{ idea, ok: true }` on success; a 401 response `{ error: "Unauthorized" }` if the requester is not authenticated; or a 404 response `{ error: "Idea not found." }` if no idea exists for the given IDs.
 */
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

/**
 * Handles PATCH requests to update a project idea within the workspace.
 *
 * Attempts to authenticate the request, validate the request body against the update schema, apply the update, and return the updated idea.
 *
 * @param request - The incoming NextRequest
 * @param params - Route params (Promise) that resolve to an object containing `"idea-id"` and `"project-id"`
 * @returns A Response containing `{ idea, ok: true }` on success; otherwise a Response with an error message and an appropriate HTTP status (400 for invalid JSON or payload/validation errors, 401 for unauthorized, 404 if the idea is not found).
 */
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
