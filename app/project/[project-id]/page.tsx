import { withAuth } from "@workos-inc/authkit-nextjs";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ConceptProjectRoadmapRail } from "@/components/concept-project/concept-project-roadmap-rail";
import { ProjectSettings } from "@/components/project/project-settings";
import { SiteHeader } from "@/components/ui/site-header";
import { getDb } from "@/lib/db";
import {
  getAccessibleProject,
  getProjectRoadmap,
  getProjectRoadmapItems,
} from "@/lib/project/server";
import { getWorkOSSession } from "@/lib/workos-session";
import { upsertViewerFromWorkOSSession } from "@/lib/zero/context";

type ProjectPageProps = {
  params: Promise<{
    "project-id": string;
  }>;
};

export const metadata: Metadata = {
  title: "Project | FurrowDev",
  description: "View a graduated FurrowDev project.",
};

function getName(name: string) {
  return name.trim() || "Untitled project";
}

function getDescription(description: string | null) {
  return description?.trim() || "No description yet.";
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { user } = await withAuth();

  if (!user) {
    redirect("/login");
  }

  const session = await getWorkOSSession();

  if (!session) {
    notFound();
  }

  const viewer = await upsertViewerFromWorkOSSession(session);
  const routeParams = await params;
  const projectId = routeParams["project-id"];
  const db = getDb();
  const project = await getAccessibleProject(viewer.id, projectId, db);

  if (!project) {
    notFound();
  }

  const [roadmap, roadmapState] = await Promise.all([
    getProjectRoadmapItems(project.roadmapId, db),
    getProjectRoadmap(project.roadmapId, db),
  ]);

  return (
    <>
      <SiteHeader back="/">
        {getName(project.name)}
        <ProjectSettings
          description={project.description}
          name={project.name}
          projectId={project.id}
        />
      </SiteHeader>

      <main className="mx-auto flex min-h-[calc(100vh-61px)] w-full max-w-350 flex-col gap-6 px-4 py-8 sm:px-6">
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Roadmap</h2>
            <p className="text-sm text-muted-foreground">
              This roadmap is the project-owned snapshot created during graduation.
            </p>
          </div>

          <ConceptProjectRoadmapRail
            canEditVersions={false}
            canInsertVersions={false}
            currentVersion={
              roadmapState
                ? {
                    currentMajor: roadmapState.currentMajor,
                    currentMinor: roadmapState.currentMinor,
                  }
                : null
            }
            disableCollapse
            scrollToCurrentVersion
            roadmap={roadmap}
            className="sticky"
          />
        </section>

        <section className="space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Description</p>
            <p className="text-base leading-7 text-foreground">
              {getDescription(project.description)}
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
