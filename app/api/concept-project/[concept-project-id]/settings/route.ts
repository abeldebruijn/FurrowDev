import { z } from "zod";
import type { NextRequest } from "next/server";

import {
  appendConceptProjectChatMessage,
  deleteAccessibleConceptProject,
  getAccessibleConceptProject,
  getConceptProjectTranscript,
  insertConceptProjectRoadmapVersion,
} from "@/lib/concept-project/server";
import { getDb } from "@/lib/db";
import { upsertViewerFromWorkOSSession } from "@/lib/zero/context";
import { getWorkOSSession } from "@/lib/workos-session";
import { conceptProjects } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import {
  CONCEPT_PROJECT_STAGE_INTRO_MESSAGES,
  conceptProjectStages,
} from "@/lib/concept-project/shared";

type ConceptProjectSettingsRouteProps = {
  params: Promise<{
    "concept-project-id": string;
  }>;
};

const updateSchema = z
  .object({
    appendIntroMessage: z.boolean().optional(),
    currentStage: z.enum(conceptProjectStages).optional(),
    name: z.string().trim().min(1).max(120).optional(),
  })
  .refine((value) => value.name !== undefined || value.currentStage !== undefined, {
    message: "Nothing to update",
  });

const insertRoadmapVersionSchema = z.object({
  description: z.string().optional(),
  majorVersion: z.int(),
  minorVersion: z.int(),
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
      ...(body.data.name ? { name: body.data.name.trim() } : {}),
      ...(body.data.currentStage ? { currentStage: body.data.currentStage } : {}),
    })
    .where(eq(conceptProjects.id, conceptProject.id));

  if (body.data.currentStage && body.data.appendIntroMessage && body.data.currentStage !== "what") {
    const nextStage = body.data.currentStage;
    const transcript = await getConceptProjectTranscript(conceptProject.id, db);
    const latestMessage = transcript.at(-1);

    if (latestMessage?.message !== CONCEPT_PROJECT_STAGE_INTRO_MESSAGES[nextStage]) {
      await db.transaction(async (tx) => {
        await appendConceptProjectChatMessage(tx, {
          chatId: conceptProject.chatId,
          message: CONCEPT_PROJECT_STAGE_INTRO_MESSAGES[nextStage],
          stage: nextStage,
          type: "agent",
        });
      });
    }
  }

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

export async function POST(request: NextRequest, { params }: ConceptProjectSettingsRouteProps) {
  const session = await getWorkOSSession(request);

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const viewer = await upsertViewerFromWorkOSSession(session);
  const { ["concept-project-id"]: conceptProjectId } = await params;
  const body = insertRoadmapVersionSchema.safeParse(await request.json());

  if (!body.success) {
    return Response.json({ error: "Invalid roadmap node" }, { status: 400 });
  }

  const db = getDb();
  const conceptProject = await getAccessibleConceptProject(viewer.id, conceptProjectId, db);

  if (!conceptProject) {
    return Response.json({ error: "Concept project not found" }, { status: 404 });
  }

  if (!conceptProject.understoodSetupAt) {
    return Response.json(
      { error: "Setup must be complete before editing the roadmap." },
      { status: 400 },
    );
  }

  try {
    const result = await db.transaction((tx) =>
      insertConceptProjectRoadmapVersion(tx, {
        conceptProjectId: conceptProject.id,
        description: body.data.description,
        majorVersion: body.data.majorVersion,
        minorVersion: body.data.minorVersion,
        name: body.data.name,
        roadmapId: conceptProject.roadmapId,
      }),
    );

    return Response.json({ id: result.id, ok: true });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Failed to insert roadmap node.",
      },
      { status: 400 },
    );
  }
}
