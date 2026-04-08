import { ApplicationError, defineMutatorWithType, defineMutators } from "@rocicorp/zero";
import { z } from "zod";

import type { ZeroContext } from "@/lib/zero/context";
import {
  assertCanAccessConceptProjectServer,
  assertChatBelongsToConceptProjectServer,
  assertViewerOwnsOrganisationServer,
  validateRoadmapParentServer,
} from "@/zero/shared";
import { schema, zql } from "@/zero/schema";

const defineMutator = defineMutatorWithType<typeof schema, ZeroContext>();
const zqlAny = zql as any;

async function bumpRoadmapVersionIfNeeded(
  tx: any,
  roadmapId: string,
  majorVersion: number,
  minorVersion: number,
) {
  const roadmap = await tx.run(zqlAny.roadmaps.where("id", roadmapId).one());

  if (!roadmap) {
    throw new ApplicationError("Roadmap not found", {
      details: {
        roadmapId,
      },
    });
  }

  const shouldBump =
    majorVersion > roadmap.currentMajor ||
    (majorVersion === roadmap.currentMajor && minorVersion > roadmap.currentMinor);

  if (!shouldBump) {
    return;
  }

  await tx.mutate.roadmaps.update({
    id: roadmapId,
    currentMajor: majorVersion,
    currentMinor: minorVersion,
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
      }),
      async ({ args, ctx, tx }) => {
        await assertCanAccessConceptProjectServer(tx, ctx, args.id);

        const next: {
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

        if (next.name === undefined && next.description === undefined) {
          return;
        }

        await tx.mutate.conceptProjects.update(next as any);
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
          name: args.name,
          description: args.description,
          majorVersion: args.majorVersion,
          minorVersion: args.minorVersion,
        } as any);

        await bumpRoadmapVersionIfNeeded(tx, args.roadmapId, args.majorVersion, args.minorVersion);
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
          next.name = args.name;
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
          await bumpRoadmapVersionIfNeeded(tx, roadmapId, majorVersion, minorVersion);
        }
      },
    ),
  },
});
