import type { NextRequest } from "next/server";

import { generateAccessibleProjectUbiquitousLanguage } from "@/lib/project/server";
import { upsertViewerFromWorkOSSession } from "@/lib/zero/context";
import { getWorkOSSession } from "@/lib/workos-session";

type ProjectUbiquitousLanguageRouteProps = {
  params: Promise<{
    "project-id": string;
  }>;
};

export async function POST(
  request: NextRequest,
  { params }: ProjectUbiquitousLanguageRouteProps,
) {
  const session = await getWorkOSSession(request);

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const viewer = await upsertViewerFromWorkOSSession(session);
  const { ["project-id"]: projectId } = await params;
  const project = await generateAccessibleProjectUbiquitousLanguage(viewer.id, projectId);

  if (!project) {
    return Response.json({ error: "Project not found." }, { status: 404 });
  }

  return Response.json({ ok: true });
}
