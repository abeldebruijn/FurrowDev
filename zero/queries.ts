import { defineQueries, defineQueryWithType } from "@rocicorp/zero";
import { z } from "zod";

import type { ZeroContext } from "@/lib/zero/context";
import { scopeConceptProjectsToViewer, visibleConceptProjectsQuery } from "@/zero/shared";
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
        .whereExists("conceptProject", (query: any) =>
          scopeConceptProjectsToViewer(query.where("id", args.conceptProjectId), ctx),
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
              .whereExists("conceptProject", (conceptProjectQuery: any) =>
                scopeConceptProjectsToViewer(
                  conceptProjectQuery.where("id", args.conceptProjectId),
                  ctx,
                ),
              ),
          )
          .orderBy("order", "asc"),
    ),
  },
  roadmaps: {
    byConceptProjectId: defineQuery(z.object({ conceptProjectId: z.uuid() }), ({ args, ctx }) =>
      zqlAny.roadmaps
        .whereExists("conceptProjects", (query: any) =>
          scopeConceptProjectsToViewer(query.where("id", args.conceptProjectId), ctx),
        )
        .one(),
    ),
    itemsByConceptProjectId: defineQuery(
      z.object({ conceptProjectId: z.uuid() }),
      ({ args, ctx }) =>
        zqlAny.roadmapItems
          .whereExists("roadmap", (roadmapQuery: any) =>
            roadmapQuery.whereExists("conceptProjects", (conceptProjectQuery: any) =>
              scopeConceptProjectsToViewer(
                conceptProjectQuery.where("id", args.conceptProjectId),
                ctx,
              ),
            ),
          )
          .orderBy("majorVersion", "asc")
          .orderBy("minorVersion", "asc")
          .orderBy("name", "asc"),
    ),
  },
});
