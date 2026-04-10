import { z } from "zod";
import type { NextRequest } from "next/server";

import { updateAccessibleProject } from "@/lib/project/server";
import { upsertViewerFromWorkOSSession } from "@/lib/zero/context";
import { getWorkOSSession } from "@/lib/workos-session";

type ProjectSettingsRouteProps = {
  params: Promise<{
    "project-id": string;
  }>;
};

const updateSchema = z
  .object({
    description: z.string().max(600).optional(),
    name: z.string().trim().min(1).max(120).optional(),
  })
  .refine((value) => value.name !== undefined || value.description !== undefined, {
    message: "Nothing to update",
  });

export async function PATCH(request: NextRequest, { params }: ProjectSettingsRouteProps) {
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

  const body = updateSchema.safeParse(rawBody);

  if (!body.success) {
    return Response.json({ error: "Invalid project update." }, { status: 400 });
  }

  const project = await updateAccessibleProject(viewer.id, projectId, body.data);

  if (!project) {
    return Response.json({ error: "Project not found." }, { status: 404 });
  }

  return Response.json({ ok: true });
}
