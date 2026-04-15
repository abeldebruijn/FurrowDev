import { cache } from "react";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { notFound, redirect } from "next/navigation";

import { getDb } from "@/lib/db";
import { getProjectAccess, getProjectRoadmap, getProjectRoadmapItems } from "@/lib/project/server";
import { listVisibleProjectVisions } from "@/lib/vision/server";
import { getWorkOSSession } from "@/lib/workos-session";
import type { WidgetProjectVision } from "@/lib/widgets/types";
import { upsertViewerFromWorkOSSession } from "@/lib/zero/context";

function serializeWidgetVision(vision: {
  collaborators: WidgetProjectVision["collaborators"];
  createdAt: Date;
  id: string;
  ownerName: string;
  ownerUserId: string;
  title: string;
  updatedAt: Date;
}): WidgetProjectVision {
  return {
    collaborators: vision.collaborators,
    createdAt: vision.createdAt.toISOString(),
    id: vision.id,
    ownerName: vision.ownerName,
    ownerUserId: vision.ownerUserId,
    title: vision.title,
    updatedAt: vision.updatedAt.toISOString(),
  };
}

export const getProjectPageData = cache(async (projectId: string) => {
  const { user } = await withAuth();

  if (!user) {
    redirect("/login");
  }

  const session = await getWorkOSSession();

  if (!session) {
    notFound();
  }

  const viewer = await upsertViewerFromWorkOSSession(session);
  const db = getDb();
  const project = await getProjectAccess(viewer.id, projectId, db);

  if (!project) {
    notFound();
  }

  const [projectRoadmap, projectRoadmapItems, projectVisions] = await Promise.all([
    getProjectRoadmap(project.roadmapId, db),
    getProjectRoadmapItems(project.roadmapId, db),
    listVisibleProjectVisions(viewer.id, projectId, db),
  ]);

  return {
    project,
    projectRoadmap,
    projectRoadmapItems,
    projectVisions: projectVisions.map(serializeWidgetVision),
    viewer,
    widgetLayout: project.layout,
  };
});
