import { ApplicationError, defineMutatorWithType, defineMutators } from "@rocicorp/zero";
import { z } from "zod";

import type { ZeroContext } from "@/lib/zero/context";
import {
  getConceptProjectRoadmapDeletePlan,
  getConceptProjectRoadmapInsertPlan,
  getPinnedConceptRoadmapCurrentVersion,
  normalizeRoadmapItemName,
} from "@/lib/concept-project/roadmap";
import { conceptProjectStages } from "@/lib/concept-project/shared";
import {
  assertCanAccessConceptProjectServer,
  assertChatBelongsToConceptProjectServer,
  assertViewerOwnsOrganisationServer,
  validateRoadmapParentServer,
} from "@/zero/shared";
import { schema, zql } from "@/zero/schema";

const defineMutator = defineMutatorWithType<typeof schema, ZeroContext>();
const zqlAny = zql as any;

async function pinConceptRoadmapVersion(tx: any, roadmapId: string) {
  const roadmap = await tx.run(zqlAny.roadmaps.where("id", roadmapId).one());

  if (!roadmap) {
    throw new ApplicationError("Roadmap not found", {
      details: {
        roadmapId,
      },
    });
  }

  if (roadmap.currentMajor === 0 && roadmap.currentMinor === 0) {
    return;
  }

  await tx.mutate.roadmaps.update({
    id: roadmapId,
    ...getPinnedConceptRoadmapCurrentVersion(),
  } as any);
}

export const mutators = defineMutators({
  conceptProjects: {
    create: defineMutator(
      z.object({
        id: z.uuid(),
        chatId: z.uuid(),
        roadmapId: z.uuid().optional(),
        name: z.string().trim().min(1).optional(),
        description: z.string().optional(),
        orgOwnerId: z.uuid().optional(),
      }),
      async ({ args, ctx, tx }) => {
        if (args.orgOwnerId) {
          await assertViewerOwnsOrganisationServer(tx, ctx, args.orgOwnerId);
        }

        if (args.roadmapId) {
          await tx.mutate.roadmaps.insert({
            id: args.roadmapId,
            currentMajor: 0,
            currentMinor: 0,
          } as any);
        }

        await tx.mutate.conceptProjects.insert({
          id: args.id,
          name: args.name,
          description: args.description,
          roadmapId: args.roadmapId,
          userOwner: args.orgOwnerId ? undefined : ctx.viewerId,
          orgOwner: args.orgOwnerId,
        } as any);

        await tx.mutate.conceptProjectChats.insert({
          id: args.chatId,
          conceptProjectId: args.id,
        } as any);
      },
    ),
    update: defineMutator(
      z.object({
        id: z.uuid(),
        name: z.string().trim().min(1).optional(),
        description: z.string().optional(),
        currentStage: z.enum(conceptProjectStages).optional(),
      }),
      async ({ args, ctx, tx }) => {
        await assertCanAccessConceptProjectServer(tx, ctx, args.id);

        if (args.currentStage === "grill_me") {
          const conceptProject = await tx.run(zqlAny.conceptProjects.where("id", args.id).one());

          if (!(conceptProject as { understoodSetupAt?: string | null } | null)?.understoodSetupAt) {
            throw new ApplicationError("Setup must be complete before entering grill me.", {
              details: {
                conceptProjectId: args.id,
              },
            });
          }
        }

        const next: {
          currentStage?: "what" | "for_whom" | "how" | "setup" | "grill_me";
          id: string;
          name?: string | null;
          description?: string | null;
        } = {
          id: args.id,
        };

        if (args.name !== undefined) {
          next.name = args.name;
        }

        if (args.description !== undefined) {
          next.description = args.description;
        }

        if (args.currentStage !== undefined) {
          next.currentStage = args.currentStage;
        }

        if (
          next.name === undefined &&
          next.description === undefined &&
          next.currentStage === undefined
        ) {
          return;
        }

        await tx.mutate.conceptProjects.update(next as any);
      },
    ),
    setStage: defineMutator(
      z.object({
        currentStage: z.enum(conceptProjectStages),
        id: z.uuid(),
      }),
      async ({ args, ctx, tx }) => {
        await assertCanAccessConceptProjectServer(tx, ctx, args.id);

        if (args.currentStage === "grill_me") {
          const conceptProject = await tx.run(zqlAny.conceptProjects.where("id", args.id).one());

          if (!(conceptProject as { understoodSetupAt?: string | null } | null)?.understoodSetupAt) {
            throw new ApplicationError("Setup must be complete before entering grill me.", {
              details: {
                conceptProjectId: args.id,
              },
            });
          }
        }

        await tx.mutate.conceptProjects.update({
          currentStage: args.currentStage,
          id: args.id,
        } as any);
      },
    ),
  },
  conceptProjectChats: {
    createMessage: defineMutator(
      z.object({
        id: z.uuid(),
        conceptProjectId: z.uuid(),
        conceptProjectChatId: z.uuid(),
        message: z.string().min(1),
        order: z.int(),
        stage: z.enum(conceptProjectStages),
        type: z.enum(["agent", "person"]),
      }),
      async ({ args, ctx, tx }) => {
        await assertCanAccessConceptProjectServer(tx, ctx, args.conceptProjectId);
        await assertChatBelongsToConceptProjectServer(
          tx,
          args.conceptProjectId,
          args.conceptProjectChatId,
        );

        await tx.mutate.conceptProjectChatMessages.insert({
          id: args.id,
          message: args.message,
          order: args.order,
          stage: args.stage,
          type: args.type,
          userId: args.type === "person" ? ctx.viewerId : undefined,
          conceptProjectChatId: args.conceptProjectChatId,
        } as any);
      },
    ),
  },
  roadmapItems: {
    create: defineMutator(
      z.object({
        id: z.uuid(),
        conceptProjectId: z.uuid(),
        roadmapId: z.uuid(),
        parentId: z.uuid().optional(),
        name: z.string().trim().min(1),
        description: z.string().optional(),
        majorVersion: z.int(),
        minorVersion: z.int(),
      }),
      async ({ args, ctx, tx }) => {
        await assertCanAccessConceptProjectServer(tx, ctx, args.conceptProjectId);
        await validateRoadmapParentServer(tx, args.roadmapId, args.parentId, {
          majorVersion: args.majorVersion,
          minorVersion: args.minorVersion,
        });

        await tx.mutate.roadmapItems.insert({
          id: args.id,
          roadmapId: args.roadmapId,
          parentId: args.parentId,
          name: normalizeRoadmapItemName(args.name),
          description: args.description,
          majorVersion: args.majorVersion,
          minorVersion: args.minorVersion,
        } as any);

        await pinConceptRoadmapVersion(tx, args.roadmapId);
      },
    ),
    insertVersionAt: defineMutator(
      z.object({
        conceptProjectId: z.uuid(),
        description: z.string().optional(),
        id: z.uuid(),
        majorVersion: z.int(),
        minorVersion: z.int(),
        name: z.string().trim().min(1),
        roadmapId: z.uuid(),
      }),
      async ({ args, ctx, tx }) => {
        if (tx.location !== "server") {
          return;
        }

        await assertCanAccessConceptProjectServer(tx, ctx, args.conceptProjectId);

        const [conceptProjectResult, currentRoadmapResult, existingItemsResult] = await Promise.all(
          [
            tx.run(zqlAny.conceptProjects.where("id", args.conceptProjectId).one()),
            tx.run(zqlAny.roadmaps.where("id", args.roadmapId).one()),
            tx.run(
              zqlAny.roadmapItems
                .where("roadmapId", args.roadmapId)
                .orderBy("majorVersion", "asc")
                .orderBy("minorVersion", "asc")
                .orderBy("name", "asc"),
            ),
          ],
        );
        const conceptProject = conceptProjectResult as { understoodSetupAt: string | null } | null;
        const currentRoadmap = currentRoadmapResult as {
          currentMajor: number;
          currentMinor: number;
        } | null;
        const existingItems = existingItemsResult as Array<{
          description: string | null;
          id: string;
          majorVersion: number;
          minorVersion: number;
          name: string;
        }>;

        if (!conceptProject?.understoodSetupAt) {
          throw new ApplicationError("Setup must be complete before editing the roadmap.", {
            details: {
              conceptProjectId: args.conceptProjectId,
            },
          });
        }

        if (!currentRoadmap) {
          throw new ApplicationError("Roadmap not found", {
            details: {
              roadmapId: args.roadmapId,
            },
          });
        }

        const plan = getConceptProjectRoadmapInsertPlan(existingItems, currentRoadmap, {
          majorVersion: args.majorVersion,
          minorVersion: args.minorVersion,
        });

        const shiftQueue = [...plan.shiftedItems].sort(
          (left, right) => right.nextMinorVersion - left.nextMinorVersion,
        );

        for (const item of shiftQueue) {
          await tx.mutate.roadmapItems.update({
            id: item.id,
            minorVersion: item.nextMinorVersion,
          } as any);
        }

        await tx.mutate.roadmapItems.insert({
          description: args.description?.trim() || undefined,
          id: args.id,
          majorVersion: args.majorVersion,
          minorVersion: args.minorVersion,
          name: normalizeRoadmapItemName(args.name),
          parentId: undefined,
          roadmapId: args.roadmapId,
        } as any);

        await pinConceptRoadmapVersion(tx, args.roadmapId);
      },
    ),
    deleteAndRepairVersion: defineMutator(
      z.object({
        conceptProjectId: z.uuid(),
        id: z.uuid(),
        roadmapId: z.uuid(),
      }),
      async ({ args, ctx, tx }) => {
        if (tx.location !== "server") {
          return;
        }

        await assertCanAccessConceptProjectServer(tx, ctx, args.conceptProjectId);

        const [conceptProjectResult, currentRoadmapResult, existingItemsResult] = await Promise.all(
          [
            tx.run(zqlAny.conceptProjects.where("id", args.conceptProjectId).one()),
            tx.run(zqlAny.roadmaps.where("id", args.roadmapId).one()),
            tx.run(
              zqlAny.roadmapItems
                .where("roadmapId", args.roadmapId)
                .orderBy("majorVersion", "asc")
                .orderBy("minorVersion", "asc")
                .orderBy("name", "asc"),
            ),
          ],
        );
        const conceptProject = conceptProjectResult as { understoodSetupAt: string | null } | null;
        const currentRoadmap = currentRoadmapResult as {
          currentMajor: number;
          currentMinor: number;
        } | null;
        const existingItems = existingItemsResult as Array<{
          description: string | null;
          id: string;
          majorVersion: number;
          minorVersion: number;
          name: string;
        }>;

        if (!conceptProject?.understoodSetupAt) {
          throw new ApplicationError("Setup must be complete before editing the roadmap.", {
            details: {
              conceptProjectId: args.conceptProjectId,
            },
          });
        }

        if (!currentRoadmap) {
          throw new ApplicationError("Roadmap not found", {
            details: {
              roadmapId: args.roadmapId,
            },
          });
        }

        const plan = getConceptProjectRoadmapDeletePlan(existingItems, currentRoadmap, args.id);

        await tx.mutate.roadmapItems.delete({
          id: args.id,
        } as any);

        const shiftQueue = [...plan.shiftedItems].sort(
          (left, right) => left.nextMinorVersion - right.nextMinorVersion,
        );

        for (const item of shiftQueue) {
          await tx.mutate.roadmapItems.update({
            id: item.id,
            minorVersion: item.nextMinorVersion,
          } as any);
        }

        await pinConceptRoadmapVersion(tx, args.roadmapId);
      },
    ),
    update: defineMutator(
      z.object({
        id: z.uuid(),
        conceptProjectId: z.uuid(),
        parentId: z.uuid().optional(),
        name: z.string().trim().min(1).optional(),
        description: z.string().optional(),
        majorVersion: z.int().optional(),
        minorVersion: z.int().optional(),
      }),
      async ({ args, ctx, tx }) => {
        await assertCanAccessConceptProjectServer(tx, ctx, args.conceptProjectId);

        const existing: any =
          tx.location === "server"
            ? await tx.run(zqlAny.roadmapItems.where("id", args.id).one())
            : null;

        if (tx.location === "server" && !existing) {
          throw new ApplicationError("Roadmap item not found", {
            details: {
              roadmapItemId: args.id,
            },
          });
        }

        const roadmapId = existing?.roadmapId;
        const majorVersion = args.majorVersion ?? existing?.majorVersion;
        const minorVersion = args.minorVersion ?? existing?.minorVersion;
        const parentId = args.parentId !== undefined ? args.parentId : existing?.parentId;

        if (roadmapId && majorVersion !== undefined && minorVersion !== undefined) {
          await validateRoadmapParentServer(tx, roadmapId, parentId, {
            majorVersion,
            minorVersion,
          });
        }

        const next: {
          id: string;
          parentId?: string | null;
          name?: string | null;
          description?: string | null;
          majorVersion?: number;
          minorVersion?: number;
        } = {
          id: args.id,
        };

        if (args.parentId !== undefined) {
          next.parentId = args.parentId;
        }

        if (args.name !== undefined) {
          next.name = normalizeRoadmapItemName(args.name);
        }

        if (args.description !== undefined) {
          next.description = args.description;
        }

        if (args.majorVersion !== undefined) {
          next.majorVersion = args.majorVersion;
        }

        if (args.minorVersion !== undefined) {
          next.minorVersion = args.minorVersion;
        }

        if (
          next.parentId === undefined &&
          next.name === undefined &&
          next.description === undefined &&
          next.majorVersion === undefined &&
          next.minorVersion === undefined
        ) {
          return;
        }

        await tx.mutate.roadmapItems.update(next as any);

        if (roadmapId && majorVersion !== undefined && minorVersion !== undefined) {
          await pinConceptRoadmapVersion(tx, roadmapId);
        }
      },
    ),
  },
});
