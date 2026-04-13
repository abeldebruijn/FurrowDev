import type { NextRequest } from "next/server";

import { generateAccessibleProjectUbiquitousLanguage } from "@/lib/project/server";
import { upsertViewerFromWorkOSSession } from "@/lib/zero/context";
import { getWorkOSSession } from "@/lib/workos-session";

type ProjectUbiquitousLanguageRouteProps = {
  params: Promise<{
    "project-id": string;
  }>;
};

export async function POST(request: NextRequest, { params }: ProjectUbiquitousLanguageRouteProps) {
  let session;

  try {
    session = await getWorkOSSession(request);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const viewer = await upsertViewerFromWorkOSSession(session);
  const { ["project-id"]: projectId } = await params;

  let project;

  try {
    project = await generateAccessibleProjectUbiquitousLanguage(viewer.id, projectId);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "ACCESS_CHANGE_CONFLICT" || error.message.includes("access changed"))
    ) {
      return Response.json(
        {
          error: "Conflict",
          code: "ACCESS_CHANGE_CONFLICT",
          details: error.message,
        },
        { status: 409 },
      );
    }

    throw error;
  }

  if (!project) {
    return Response.json({ error: "Project not found." }, { status: 404 });
  }

  return Response.json({ ok: true });
}
