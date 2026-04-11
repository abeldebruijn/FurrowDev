import { randomUUID } from "node:crypto";

import { and, eq, or } from "drizzle-orm";

import {
  conceptProjects,
  organisations,
  roadmapItems,
  roadmaps,
  projects,
} from "@/drizzle/schema";
import { getDb, type Database } from "@/lib/db";
import {
  getConceptProjectRoadmap,
  getConceptProjectRoadmapItems,
  getAccessibleConceptProject,
  getConceptProjectTranscript,
} from "@/lib/concept-project/server";
import { generateProjectUbiquitousLanguageMarkdown } from "@/lib/project/ubiquitous-language";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export type AccessibleProject = {
  conceptProjectId: string | null;
  conceptProjectName: string | null;
  createdAt: Date;
  description: string | null;
  id: string;
  name: string;
  roadmapId: string | null;
  ubiquitousLanguageMarkdown: string | null;
};

export type ProjectRoadmap = Awaited<ReturnType<typeof getProjectRoadmap>>;
export type ProjectRoadmapItem = Awaited<ReturnType<typeof getProjectRoadmapItems>>[number];

async function cloneRoadmapSnapshot(
  tx: Transaction,
  sourceRoadmapId: string | null,
): Promise<string> {
  const nextRoadmapId = randomUUID();
  const [sourceRoadmap, sourceItems] = sourceRoadmapId
    ? await Promise.all([
        tx
          .select({
            currentMajor: roadmaps.currentMajor,
            currentMinor: roadmaps.currentMinor,
            id: roadmaps.id,
          })
          .from(roadmaps)
          .where(eq(roadmaps.id, sourceRoadmapId))
          .limit(1)
          .then((rows) => rows[0] ?? null),
        tx
          .select({
            description: roadmapItems.description,
            id: roadmapItems.id,
            majorVersion: roadmapItems.majorVersion,
            minorVersion: roadmapItems.minorVersion,
            name: roadmapItems.name,
          })
          .from(roadmapItems)
          .where(eq(roadmapItems.roadmapId, sourceRoadmapId))
          .orderBy(roadmapItems.majorVersion, roadmapItems.minorVersion, roadmapItems.name),
      ])
    : [null, []];

  await tx.insert(roadmaps).values({
    currentMajor: sourceRoadmap?.currentMajor ?? 0,
    currentMinor: sourceRoadmap?.currentMinor ?? 0,
    id: nextRoadmapId,
  });

  if (sourceItems.length > 0) {
    await tx.insert(roadmapItems).values(
      sourceItems.map((item) => ({
        description: item.description,
        id: randomUUID(),
        majorVersion: item.majorVersion,
        minorVersion: item.minorVersion,
        name: item.name,
        parentId: null,
        roadmapId: nextRoadmapId,
      })),
    );
  }

  return nextRoadmapId;
}

export async function getAccessibleProject(
  viewerId: string,
  projectId: string,
  db: Database = getDb(),
) {
  const rows = await db
    .select({
      conceptProjectId: projects.conceptProjectId,
      conceptProjectName: conceptProjects.name,
      createdAt: projects.createdAt,
      description: projects.description,
      id: projects.id,
      name: projects.name,
      roadmapId: projects.roadmapId,
      ubiquitousLanguageMarkdown: projects.ubiquitousLanguageMarkdown,
    })
    .from(projects)
    .leftJoin(organisations, eq(projects.orgOwner, organisations.id))
    .leftJoin(conceptProjects, eq(projects.conceptProjectId, conceptProjects.id))
    .where(
      and(
        eq(projects.id, projectId),
        or(eq(projects.userOwner, viewerId), eq(organisations.ownerId, viewerId)),
      ),
    )
    .limit(1);

  return (rows[0] ?? null) as AccessibleProject | null;
}

export async function getAccessibleProjectByConceptProjectId(
  viewerId: string,
  conceptProjectId: string,
  db: Database = getDb(),
) {
  const rows = await db
    .select({
      conceptProjectId: projects.conceptProjectId,
      conceptProjectName: conceptProjects.name,
      createdAt: projects.createdAt,
      description: projects.description,
      id: projects.id,
      name: projects.name,
      roadmapId: projects.roadmapId,
      ubiquitousLanguageMarkdown: projects.ubiquitousLanguageMarkdown,
    })
    .from(projects)
    .leftJoin(organisations, eq(projects.orgOwner, organisations.id))
    .leftJoin(conceptProjects, eq(projects.conceptProjectId, conceptProjects.id))
    .where(
      and(
        eq(projects.conceptProjectId, conceptProjectId),
        or(eq(projects.userOwner, viewerId), eq(organisations.ownerId, viewerId)),
      ),
    )
    .limit(1);

  return (rows[0] ?? null) as AccessibleProject | null;
}

export async function listAccessibleProjects(viewerId: string, db: Database = getDb()) {
  return db
    .select({
      description: projects.description,
      id: projects.id,
      name: projects.name,
    })
    .from(projects)
    .leftJoin(organisations, eq(projects.orgOwner, organisations.id))
    .where(or(eq(projects.userOwner, viewerId), eq(organisations.ownerId, viewerId)))
    .orderBy(projects.createdAt);
}

export async function getProjectRoadmapItems(roadmapId: string | null, db: Database = getDb()) {
  return getConceptProjectRoadmapItems(roadmapId, db);
}

export async function getProjectRoadmap(roadmapId: string | null, db: Database = getDb()) {
  return getConceptProjectRoadmap(roadmapId, db);
}

export async function graduateConceptProjectToProject(
  viewerId: string,
  conceptProjectId: string,
  db: Database = getDb(),
) {
  const conceptProject = await getAccessibleConceptProject(viewerId, conceptProjectId, db);

  if (!conceptProject) {
    throw new Error("Concept project not found.");
  }

  if (!conceptProject.understoodSetupAt) {
    throw new Error("Setup must be complete before graduation.");
  }

  const existingProject = await getAccessibleProjectByConceptProjectId(viewerId, conceptProjectId, db);

  if (existingProject) {
    return existingProject;
  }

  const projectId = await db.transaction(async (tx) => {
    const roadmapId = await cloneRoadmapSnapshot(tx, conceptProject.roadmapId);
    const nextProjectId = randomUUID();
    const [transcript, roadmapItems] = await Promise.all([
      getConceptProjectTranscript(conceptProject.id, tx),
      getConceptProjectRoadmapItems(conceptProject.roadmapId, tx),
    ]);
    const ubiquitousLanguageMarkdown = await generateProjectUbiquitousLanguageMarkdown({
      description: conceptProject.description,
      forWhomSummary: conceptProject.forWhomSummary,
      howSummary: conceptProject.howSummary,
      name: conceptProject.name,
      roadmapItems,
      setupSummary: conceptProject.setupSummary,
      transcript,
      whatSummary: conceptProject.whatSummary,
    });

    await tx.insert(projects).values({
      conceptProjectId: conceptProject.id,
      description: conceptProject.description,
      id: nextProjectId,
      name: conceptProject.name?.trim() || "Untitled project",
      orgOwner: conceptProject.orgOwner,
      roadmapId,
      ubiquitousLanguageMarkdown,
      userOwner: conceptProject.userOwner,
    });

    return nextProjectId;
  });

  const project = await getAccessibleProject(viewerId, projectId, db);

  if (!project) {
    throw new Error("Project not found after graduation.");
  }

  return project;
}

export async function updateAccessibleProject(
  viewerId: string,
  projectId: string,
  values: {
    description?: string | null;
    name?: string;
    ubiquitousLanguageMarkdown?: string | null;
  },
  db: Database = getDb(),
) {
  const project = await getAccessibleProject(viewerId, projectId, db);

  if (!project) {
    return null;
  }

  const nextValues: {
    description?: string | null;
    name?: string;
    ubiquitousLanguageMarkdown?: string | null;
  } = {};

  if (values.description !== undefined) {
    nextValues.description = values.description?.trim() || null;
  }

  if (values.name !== undefined) {
    nextValues.name = values.name.trim();
  }

  if (values.ubiquitousLanguageMarkdown !== undefined) {
    nextValues.ubiquitousLanguageMarkdown = values.ubiquitousLanguageMarkdown?.trim() || null;
  }

  if (Object.keys(nextValues).length === 0) {
    return project;
  }

  await db
    .update(projects)
    .set(nextValues)
    .where(eq(projects.id, projectId));

  return getAccessibleProject(viewerId, projectId, db);
}
