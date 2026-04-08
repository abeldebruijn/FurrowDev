import { z } from "zod";
import type { NextRequest } from "next/server";

import { deleteAccessibleConceptProject, getAccessibleConceptProject } from "@/lib/concept-project/server";
import { getDb } from "@/lib/db";
import { upsertViewerFromWorkOSSession } from "@/lib/zero/context";
import { getWorkOSSession } from "@/lib/workos-session";
import { conceptProjects } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

type ConceptProjectSettingsRouteProps = {
  params: Promise<{
    "concept-project-id": string;
  }>;
};

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export async function PATCH(request: NextRequest, { params }: ConceptProjectSettingsRouteProps) {
  const session = await getWorkOSSession(request);

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const viewer = await upsertViewerFromWorkOSSession(session);
  const { ["concept-project-id"]: conceptProjectId } = await params;
  const body = updateSchema.safeParse(await request.json());

  if (!body.success) {
    return Response.json({ error: "Invalid name" }, { status: 400 });
  }

  const db = getDb();
  const conceptProject = await getAccessibleConceptProject(viewer.id, conceptProjectId, db);

  if (!conceptProject) {
    return Response.json({ error: "Concept project not found" }, { status: 404 });
  }

  await db
    .update(conceptProjects)
    .set({
      name: body.data.name.trim(),
    })
    .where(eq(conceptProjects.id, conceptProject.id));

  return Response.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: ConceptProjectSettingsRouteProps) {
  const session = await getWorkOSSession(request);

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const viewer = await upsertViewerFromWorkOSSession(session);
  const { ["concept-project-id"]: conceptProjectId } = await params;
  const db = getDb();
  const deleted = await deleteAccessibleConceptProject(viewer.id, conceptProjectId, db);

  if (!deleted) {
    return Response.json({ error: "Concept project not found" }, { status: 404 });
  }

  return Response.json({ ok: true });
}
