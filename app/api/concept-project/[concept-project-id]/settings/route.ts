import { z } from "zod";
import type { NextRequest } from "next/server";

import {
  appendConceptProjectChatMessage,
  deleteAccessibleConceptProject,
  deleteConceptProjectRoadmapNode,
  getAccessibleConceptProject,
  getConceptProjectTranscript,
  insertConceptProjectRoadmapVersion,
} from "@/lib/concept-project/server";
import { normalizeRoadmapItemName } from "@/lib/concept-project/roadmap";
import { getDb } from "@/lib/db";
import { upsertViewerFromWorkOSSession } from "@/lib/zero/context";
import { getWorkOSSession } from "@/lib/workos-session";
import { conceptProjects, roadmapItems } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
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

const updateRoadmapNodeSchema = z.object({
  description: z.string().optional(),
  nodeId: z.uuid(),
  nodeName: z.string().trim().min(1).max(120),
});

const deleteRoadmapNodeSchema = z.object({
  nodeId: z.uuid(),
});

const deleteConceptProjectSchema = z.object({
  deleteConceptProject: z.literal(true),
});

function getFriendlySettingsError(error: unknown, requestedStage?: string) {
  const message = error instanceof Error ? error.message : "";

  if (
    requestedStage === "grill_me" &&
    message.includes('invalid input value for enum concept_project_stage: "grill_me"')
  ) {
    return "Database schema is missing the grill me stage. Run the latest DB migration, then try again.";
  }

  return null;
}

export async function PATCH(request: NextRequest, { params }: ConceptProjectSettingsRouteProps) {
  const session = await getWorkOSSession(request);

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const viewer = await upsertViewerFromWorkOSSession(session);
  const { ["concept-project-id"]: conceptProjectId } = await params;
  const rawBody = await request.json().catch(() => null);

  if (rawBody === null) {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const body = updateSchema.safeParse(rawBody);
  const roadmapNodeBody = updateRoadmapNodeSchema.safeParse(rawBody);

  if (!body.success && !roadmapNodeBody.success) {
    return Response.json(
      {
        error: "Validation failed.",
        roadmapNodeErrors: roadmapNodeBody.error.flatten(),
        updateErrors: body.error.flatten(),
      },
      { status: 400 },
    );
  }

  const db = getDb();
  const conceptProject = await getAccessibleConceptProject(viewer.id, conceptProjectId, db);

  if (!conceptProject) {
    return Response.json({ error: "Concept project not found" }, { status: 404 });
  }

  if (body.success) {
    if (conceptProject.projectId) {
      return Response.json({ error: "Archived concept projects are read-only." }, { status: 400 });
    }

    if (body.data.currentStage === "grill_me" && !conceptProject.understoodSetupAt) {
      return Response.json(
        { error: "Setup must be complete before entering grill me." },
        { status: 400 },
      );
    }

    try {
      await db
        .update(conceptProjects)
        .set({
          ...(body.data.name ? { name: body.data.name.trim() } : {}),
          ...(body.data.currentStage ? { currentStage: body.data.currentStage } : {}),
        })
        .where(eq(conceptProjects.id, conceptProject.id));
    } catch (error) {
      const friendlyError = getFriendlySettingsError(error, body.data.currentStage);

      if (friendlyError) {
        return Response.json({ error: friendlyError }, { status: 400 });
      }

      throw error;
    }
  }

  if (roadmapNodeBody.success) {
    if (conceptProject.projectId) {
      return Response.json({ error: "Archived concept projects are read-only." }, { status: 400 });
    }

    if (!conceptProject.understoodSetupAt) {
      return Response.json(
        { error: "Setup must be complete before editing the roadmap." },
        { status: 400 },
      );
    }

    const updatedRows = await db
      .update(roadmapItems)
      .set({
        description: roadmapNodeBody.data.description?.trim() || null,
        name: normalizeRoadmapItemName(roadmapNodeBody.data.nodeName),
      })
      .where(
        and(
          eq(roadmapItems.id, roadmapNodeBody.data.nodeId),
          eq(roadmapItems.roadmapId, conceptProject.roadmapId ?? ""),
        ),
      )
      .returning({
        id: roadmapItems.id,
      });

    if (updatedRows.length === 0) {
      return Response.json({ error: "Roadmap node not found" }, { status: 404 });
    }
  }

  if (
    body.success &&
    body.data.currentStage &&
    body.data.appendIntroMessage &&
    body.data.currentStage !== "what"
  ) {
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
  const rawBody = await request.json().catch(() => null);
  const roadmapNodeBody = deleteRoadmapNodeSchema.safeParse(rawBody);
  const conceptProjectDeleteBody = deleteConceptProjectSchema.safeParse(rawBody);

  if (roadmapNodeBody.success) {
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

    if (conceptProject.projectId) {
      return Response.json({ error: "Archived concept projects are read-only." }, { status: 400 });
    }

    try {
      await db.transaction((tx) =>
        deleteConceptProjectRoadmapNode(tx, {
          conceptProjectId: conceptProject.id,
          id: roadmapNodeBody.data.nodeId,
          roadmapId: conceptProject.roadmapId,
        }),
      );

      return Response.json({ ok: true });
    } catch (error) {
      return Response.json(
        {
          error: error instanceof Error ? error.message : "Failed to delete roadmap node.",
        },
        { status: 400 },
      );
    }
  }

  if (!conceptProjectDeleteBody.success) {
    return Response.json({ error: "Explicit delete intent required." }, { status: 400 });
  }

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
  const rawBody = await request.json().catch(() => null);

  if (rawBody === null) {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const body = insertRoadmapVersionSchema.safeParse(rawBody);

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

  if (conceptProject.projectId) {
    return Response.json({ error: "Archived concept projects are read-only." }, { status: 400 });
  }

  try {
    const result = await db.transaction((tx) =>
      insertConceptProjectRoadmapVersion(tx, {
        conceptProjectId: conceptProject.id,
        description: body.data.description,
        majorVersion: body.data.majorVersion,
        minorVersion: body.data.minorVersion,
        name: normalizeRoadmapItemName(body.data.name),
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
