import { randomUUID } from "node:crypto";

import { and, eq, isNull, or } from "drizzle-orm";

import {
  admins,
  conceptProjects,
  maintainers,
  organisations,
  type ProjectWidgetLayoutItem,
  projectWidgetLayouts,
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
  orgOwner: string | null;
  roadmapId: string | null;
  ubiquitousLanguageMarkdown: string | null;
  userOwner: string | null;
};

export type ProjectAccess = AccessibleProject & {
  canViewModeration: boolean;
  canViewSettings: boolean;
  isAdmin: boolean;
  isMaintainer: boolean;
  isOrganisationProject: boolean;
  isOwner: boolean;
  layout: {
    id: string;
    largeLayout: {
      hSize: number;
      widgetName: string;
      wSize: number;
      xPos: number;
      yPos: number;
    }[];
    mediumAutoLayout: boolean;
    mediumLayout:
      | {
          hSize: number;
          widgetName: string;
          wSize: number;
          xPos: number;
          yPos: number;
        }[]
      | null;
    smallAutoLayout: boolean;
    smallLayout:
      | {
          hSize: number;
          widgetName: string;
          wSize: number;
          xPos: number;
          yPos: number;
        }[]
      | null;
    version: number;
  } | null;
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
      orgOwner: projects.orgOwner,
      roadmapId: projects.roadmapId,
      ubiquitousLanguageMarkdown: projects.ubiquitousLanguageMarkdown,
      userOwner: projects.userOwner,
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

export async function getProjectAccess(
  viewerId: string,
  projectId: string,
  db: Database = getDb(),
): Promise<ProjectAccess | null> {
  const rows = await db
    .select({
      adminUserId: admins.userId,
      conceptProjectId: projects.conceptProjectId,
      conceptProjectName: conceptProjects.name,
      createdAt: projects.createdAt,
      description: projects.description,
      id: projects.id,
      largeLayout: projectWidgetLayouts.largeLayout,
      maintainerUserId: maintainers.userId,
      name: projects.name,
      mediumAutoLayout: projectWidgetLayouts.mediumAutoLayout,
      mediumLayout: projectWidgetLayouts.mediumLayout,
      organisationOwnerId: organisations.ownerId,
      orgOwner: projects.orgOwner,
      roadmapId: projects.roadmapId,
      smallAutoLayout: projectWidgetLayouts.smallAutoLayout,
      smallLayout: projectWidgetLayouts.smallLayout,
      ubiquitousLanguageMarkdown: projects.ubiquitousLanguageMarkdown,
      userOwner: projects.userOwner,
      version: projectWidgetLayouts.version,
      widgetLayoutId: projectWidgetLayouts.id,
    })
    .from(projects)
    .leftJoin(organisations, eq(projects.orgOwner, organisations.id))
    .leftJoin(conceptProjects, eq(projects.conceptProjectId, conceptProjects.id))
    .leftJoin(projectWidgetLayouts, eq(projects.widgetLayoutId, projectWidgetLayouts.id))
    .leftJoin(admins, and(eq(admins.projectId, projects.id), eq(admins.userId, viewerId)))
    .leftJoin(
      maintainers,
      and(eq(maintainers.projectId, projects.id), eq(maintainers.userId, viewerId)),
    )
    .where(
      and(
        eq(projects.id, projectId),
        or(
          eq(projects.userOwner, viewerId),
          eq(organisations.ownerId, viewerId),
          eq(admins.userId, viewerId),
          eq(maintainers.userId, viewerId),
        ),
      ),
    )
    .limit(1);

  const project = rows[0] ?? null;

  if (!project) {
    return null;
  }

  const isOwner = project.userOwner === viewerId || project.organisationOwnerId === viewerId;
  const isAdmin = project.adminUserId === viewerId;
  const isMaintainer = project.maintainerUserId === viewerId;
  const isOrganisationProject = project.orgOwner !== null;

  return {
    conceptProjectId: project.conceptProjectId,
    conceptProjectName: project.conceptProjectName,
    createdAt: project.createdAt,
    description: project.description,
    id: project.id,
    layout:
      project.widgetLayoutId === null
        ? null
        : {
            id: project.widgetLayoutId,
            largeLayout: project.largeLayout ?? [],
            mediumAutoLayout: project.mediumAutoLayout ?? true,
            mediumLayout: project.mediumLayout,
            smallAutoLayout: project.smallAutoLayout ?? true,
            smallLayout: project.smallLayout,
            version: project.version ?? 1,
          },
    name: project.name,
    orgOwner: project.orgOwner,
    roadmapId: project.roadmapId,
    ubiquitousLanguageMarkdown: project.ubiquitousLanguageMarkdown,
    userOwner: project.userOwner,
    canViewModeration: isOrganisationProject && (isOwner || isAdmin),
    canViewSettings: isOwner || isAdmin,
    isAdmin,
    isMaintainer,
    isOrganisationProject,
    isOwner,
  };
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
      orgOwner: projects.orgOwner,
      roadmapId: projects.roadmapId,
      ubiquitousLanguageMarkdown: projects.ubiquitousLanguageMarkdown,
      userOwner: projects.userOwner,
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

  const existingProject = await getAccessibleProjectByConceptProjectId(
    viewerId,
    conceptProjectId,
    db,
  );

  if (existingProject) {
    return existingProject;
  }

  const [transcript, roadmapItems] = await Promise.all([
    getConceptProjectTranscript(conceptProject.id, db),
    getConceptProjectRoadmapItems(conceptProject.roadmapId, db),
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

  const projectId = await db.transaction(async (tx) => {
    const roadmapId = await cloneRoadmapSnapshot(tx, conceptProject.roadmapId);
    const nextProjectId = randomUUID();

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

export async function generateAccessibleProjectUbiquitousLanguage(
  viewerId: string,
  projectId: string,
  db: Database = getDb(),
) {
  const project = await getAccessibleProject(viewerId, projectId, db);

  if (!project) {
    return null;
  }

  const conceptProject =
    project.conceptProjectId !== null
      ? await getAccessibleConceptProject(viewerId, project.conceptProjectId, db)
      : null;

  const [roadmapItems, transcript] = await Promise.all([
    getProjectRoadmapItems(project.roadmapId, db),
    project.conceptProjectId && conceptProject
      ? getConceptProjectTranscript(project.conceptProjectId, db)
      : Promise.resolve([]),
  ]);

  const ubiquitousLanguageMarkdown = await generateProjectUbiquitousLanguageMarkdown({
    description: project.description,
    forWhomSummary: conceptProject?.forWhomSummary ?? null,
    howSummary: conceptProject?.howSummary ?? null,
    name: project.name,
    roadmapItems,
    setupSummary: conceptProject?.setupSummary ?? null,
    transcript,
    whatSummary: conceptProject?.whatSummary ?? null,
  });

  const updatedProjects = await db
    .update(projects)
    .set({ ubiquitousLanguageMarkdown })
    .where(
      and(
        eq(projects.id, project.id),
        project.userOwner === null
          ? isNull(projects.userOwner)
          : eq(projects.userOwner, project.userOwner),
        project.orgOwner === null
          ? isNull(projects.orgOwner)
          : eq(projects.orgOwner, project.orgOwner),
      ),
    )
    .returning({ id: projects.id });

  if (updatedProjects.length === 0) {
    throw new Error("Project could not be updated because access changed.");
  }

  return {
    ...project,
    ubiquitousLanguageMarkdown,
  };
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
    nextValues.ubiquitousLanguageMarkdown =
      values.ubiquitousLanguageMarkdown === null || /^\s*$/.test(values.ubiquitousLanguageMarkdown)
        ? null
        : values.ubiquitousLanguageMarkdown;
  }

  if (Object.keys(nextValues).length === 0) {
    return project;
  }

  await db.update(projects).set(nextValues).where(eq(projects.id, projectId));

  return getAccessibleProject(viewerId, projectId, db);
}

export async function saveAccessibleProjectWidgetLayout(
  viewerId: string,
  projectId: string,
  largeLayout: ProjectWidgetLayoutItem[],
  db: Database = getDb(),
) {
  const project = await getProjectAccess(viewerId, projectId, db);

  if (!project) {
    return { error: "not_found" as const };
  }

  if (!project.canViewSettings) {
    return { error: "forbidden" as const };
  }

  await db.transaction(async (tx) => {
    if (project.layout?.id) {
      await tx
        .update(projectWidgetLayouts)
        .set({
          largeLayout,
        })
        .where(eq(projectWidgetLayouts.id, project.layout.id));

      return;
    }

    const widgetLayoutId = randomUUID();
    await tx.insert(projectWidgetLayouts).values({
      id: widgetLayoutId,
      largeLayout,
      mediumAutoLayout: true,
      mediumLayout: null,
      smallAutoLayout: true,
      smallLayout: null,
      version: 1,
    });

    const [claimedProject] = await tx
      .update(projects)
      .set({
        widgetLayoutId,
      })
      .where(and(eq(projects.id, projectId), isNull(projects.widgetLayoutId)))
      .returning({
        widgetLayoutId: projects.widgetLayoutId,
      });

    if (claimedProject) {
      return;
    }

    await tx.delete(projectWidgetLayouts).where(eq(projectWidgetLayouts.id, widgetLayoutId));

    const [existingProject] = await tx
      .select({
        widgetLayoutId: projects.widgetLayoutId,
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!existingProject?.widgetLayoutId) {
      throw new Error(`Project widget layout claim failed for ${projectId}`);
    }

    await tx
      .update(projectWidgetLayouts)
      .set({
        largeLayout,
      })
      .where(eq(projectWidgetLayouts.id, existingProject.widgetLayoutId));
  });

  return { error: null };
}
