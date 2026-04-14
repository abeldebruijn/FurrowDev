import { cache } from "react";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { notFound, redirect } from "next/navigation";

import { getDb } from "@/lib/db";
import { getProjectAccess } from "@/lib/project/server";
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
  const project = await getProjectAccess(viewer.id, projectId, getDb());

  if (!project) {
    notFound();
  }

  return {
    project,
    widgetLayout: project.layout,
  };
});
