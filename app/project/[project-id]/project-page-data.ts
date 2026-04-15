import { cache } from "react";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { notFound, redirect } from "next/navigation";

import { getDb } from "@/lib/db";
import { getProjectAccess, getProjectRoadmap, getProjectRoadmapItems } from "@/lib/project/server";
import { getWorkOSSession } from "@/lib/workos-session";
import { upsertViewerFromWorkOSSession } from "@/lib/zero/context";

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

  const [projectRoadmap, projectRoadmapItems] = await Promise.all([
    getProjectRoadmap(project.roadmapId, db),
    getProjectRoadmapItems(project.roadmapId, db),
  ]);

  return {
    project,
    projectRoadmap,
    projectRoadmapItems,
    widgetLayout: project.layout,
  };
});
