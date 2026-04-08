import { ApplicationError } from "@rocicorp/zero";

import type { ZeroContext } from "@/lib/zero/context";
import { assertValidRoadmapParentVersion } from "@/lib/zero/roadmap";
import { zql } from "@/zero/schema";

const zqlAny = zql as any;

export function visibleConceptProjectsQuery(ctx: ZeroContext) {
  return zqlAny.conceptProjects.where(({ cmp, exists, or }: any) =>
    or(
      cmp("userOwner", ctx.viewerId),
      exists("ownerOrganisation", (query: any) => query.where("ownerId", ctx.viewerId)),
    ),
  );
}

export async function assertCanAccessConceptProjectServer(
  tx: any,
  ctx: ZeroContext,
  conceptProjectId: string,
) {
  if (tx.location !== "server") {
    return;
  }

  const conceptProject = await tx.run(
    visibleConceptProjectsQuery(ctx).where("id", conceptProjectId).one(),
  );

  if (!conceptProject) {
    throw new ApplicationError("Concept project not found or not accessible", {
      details: {
        conceptProjectId,
      },
    });
  }
}

export async function assertViewerOwnsOrganisationServer(
  tx: any,
  ctx: ZeroContext,
  organisationId: string,
) {
  if (tx.location !== "server") {
    return;
  }

  const organisation = await tx.run(
    zqlAny.organisations.where("id", organisationId).where("ownerId", ctx.viewerId).one(),
  );

  if (!organisation) {
    throw new ApplicationError("Organisation not found or not owned by viewer", {
      details: {
        organisationId,
      },
    });
  }
}

export async function assertChatBelongsToConceptProjectServer(
  tx: any,
  conceptProjectId: string,
  conceptProjectChatId: string,
) {
  if (tx.location !== "server") {
    return;
  }

  const chat = await tx.run(
    zqlAny.conceptProjectChats
      .where("id", conceptProjectChatId)
      .where("conceptProjectId", conceptProjectId)
      .one(),
  );

  if (!chat) {
    throw new ApplicationError("Concept project chat does not match concept project", {
      details: {
        conceptProjectChatId,
        conceptProjectId,
      },
    });
  }
}

export async function validateRoadmapParentServer(
  tx: any,
  roadmapId: string,
  parentId: string | null | undefined,
  child: { majorVersion: number; minorVersion: number },
) {
  if (tx.location !== "server" || !parentId) {
    return;
  }

  const parent = await tx.run(
    zqlAny.roadmapItems.where("id", parentId).where("roadmapId", roadmapId).one(),
  );

  if (!parent) {
    throw new ApplicationError("Roadmap parent does not belong to roadmap", {
      details: {
        parentId,
        roadmapId,
      },
    });
  }

  assertValidRoadmapParentVersion(parent, child);
}
