import type { NextRequest } from "next/server";
import { z } from "zod";

import { regenerateIdeaDocuments, updateIdeaDocuments } from "@/lib/idea/server";
import { upsertViewerFromWorkOSSession } from "@/lib/zero/context";
import { getWorkOSSession } from "@/lib/workos-session";

type IdeaSpecRouteProps = {
  params: Promise<{
    "idea-id": string;
    "project-id": string;
  }>;
};

const updateSchema = z
  .object({
    specSheet: z.string().trim().max(30000).optional(),
    userStories: z.string().trim().max(30000).optional(),
  })
  .refine((value) => value.specSheet !== undefined || value.userStories !== undefined, {
    message: "Nothing to update",
  });

const regenerateSchema = z
  .object({
    specSheet: z.boolean().optional(),
    userStories: z.boolean().optional(),
  })
  .refine((value) => value.specSheet === true || value.userStories === true, {
    message: "Nothing to regenerate",
  });

function getErrorResponse(error: "invalid_update" | "not_found" | null) {
  switch (error) {
    case "invalid_update":
      return Response.json({ error: "Invalid idea update." }, { status: 400 });
    case "not_found":
      return Response.json({ error: "Idea not found." }, { status: 404 });
    default:
      return null;
  }
}

async function requireViewer(request: NextRequest) {
  const session = await getWorkOSSession(request);

  if (!session) {
    return null;
  }

  return upsertViewerFromWorkOSSession(session);
}

export async function PATCH(request: NextRequest, { params }: IdeaSpecRouteProps) {
  const viewer = await requireViewer(request);

  if (!viewer) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ["idea-id"]: ideaId, ["project-id"]: projectId } = await params;
  const rawBody = await request.json().catch(() => null);

  if (rawBody === null) {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const body = updateSchema.safeParse(rawBody);

  if (!body.success) {
    return Response.json({ error: "Invalid idea update." }, { status: 400 });
  }

  const result = await updateIdeaDocuments(viewer.id, projectId, ideaId, {
    specSheet: body.data.specSheet,
    userStories: body.data.userStories,
  });
  const errorResponse = getErrorResponse(result.error);

  if (errorResponse) {
    return errorResponse;
  }

  return Response.json({ ok: true });
}

export async function POST(request: NextRequest, { params }: IdeaSpecRouteProps) {
  const viewer = await requireViewer(request);

  if (!viewer) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ["idea-id"]: ideaId, ["project-id"]: projectId } = await params;
  const rawBody = await request.json().catch(() => null);

  if (rawBody === null) {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const body = regenerateSchema.safeParse(rawBody);

  if (!body.success) {
    return Response.json({ error: "Invalid regeneration request." }, { status: 400 });
  }

  const result = await regenerateIdeaDocuments(viewer.id, projectId, ideaId, {
    specSheet: body.data.specSheet,
    userStories: body.data.userStories,
  });
  const errorResponse = getErrorResponse(result.error);

  if (errorResponse) {
    return errorResponse;
  }

  return Response.json({ ok: true });
}
