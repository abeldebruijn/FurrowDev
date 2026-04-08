import { defineQueries, defineQueryWithType } from "@rocicorp/zero";
import { z } from "zod";

import type { ZeroContext } from "@/lib/zero/context";
import { visibleConceptProjectsQuery } from "@/zero/shared";
import { schema, zql } from "@/zero/schema";

const defineQuery = defineQueryWithType<typeof schema, ZeroContext>();
const zqlAny = zql as any;

export const queries = defineQueries({
  viewer: {
    current: defineQuery(({ ctx }) => zqlAny.users.where("id", ctx.viewerId).one()),
  },
  conceptProjects: {
    visible: defineQuery(({ ctx }) => visibleConceptProjectsQuery(ctx).orderBy("id", "asc")),
    byId: defineQuery(z.object({ id: z.uuid() }), ({ args, ctx }) =>
      visibleConceptProjectsQuery(ctx).where("id", args.id).one(),
    ),
  },
  conceptProjectChats: {
    byConceptProjectId: defineQuery(z.object({ conceptProjectId: z.uuid() }), ({ args, ctx }) =>
      zqlAny.conceptProjectChats
        .where("conceptProjectId", args.conceptProjectId)
        .whereExists("conceptProject", (_query: any) =>
          visibleConceptProjectsQuery(ctx).where("id", args.conceptProjectId),
        )
        .one(),
    ),
    messagesByConceptProjectId: defineQuery(
      z.object({ conceptProjectId: z.uuid() }),
      ({ args, ctx }) =>
        zqlAny.conceptProjectChatMessages
          .whereExists("conceptProjectChat", (query: any) =>
            query
              .where("conceptProjectId", args.conceptProjectId)
              .whereExists("conceptProject", () =>
                visibleConceptProjectsQuery(ctx).where("id", args.conceptProjectId),
              ),
          )
          .orderBy("order", "asc"),
    ),
  },
  roadmaps: {
    byConceptProjectId: defineQuery(z.object({ conceptProjectId: z.uuid() }), ({ args, ctx }) =>
      zqlAny.roadmaps
        .whereExists("conceptProjects", (_query: any) =>
          visibleConceptProjectsQuery(ctx).where("id", args.conceptProjectId),
        )
        .one(),
    ),
    itemsByConceptProjectId: defineQuery(
      z.object({ conceptProjectId: z.uuid() }),
      ({ args, ctx }) =>
        zqlAny.roadmapItems
          .whereExists("roadmap", (roadmapQuery: any) =>
            roadmapQuery.whereExists("conceptProjects", () =>
              visibleConceptProjectsQuery(ctx).where("id", args.conceptProjectId),
            ),
          )
          .orderBy("majorVersion", "asc")
          .orderBy("minorVersion", "asc")
          .orderBy("name", "asc"),
    ),
  },
});
