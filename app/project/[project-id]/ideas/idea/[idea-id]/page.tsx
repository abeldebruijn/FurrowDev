import { notFound } from "next/navigation";

import { IdeaWorkspace } from "@/components/idea/idea-workspace";
import { getProjectIdeaById } from "@/lib/idea/server";

import { getProjectPageData } from "../../../project-page-data";

type IdeaPageProps = {
  params: Promise<{
    "idea-id": string;
    "project-id": string;
  }>;
};

/**
 * Renders the Idea workspace page for a specific idea within a project.
 *
 * Loads the project context and the requested idea, triggers Next.js 404 behavior if the idea is not found, and returns the page UI that mounts `IdeaWorkspace` with a normalized `idea` object, the project id, and the project's roadmap items.
 *
 * @param params - A promise that resolves to route parameters containing `"idea-id"` and `"project-id"`.
 * @returns The page's React element that renders the `IdeaWorkspace` for the requested idea.
 */
export default async function IdeaPage({ params }: IdeaPageProps) {
  const routeParams = await params;
  const { project, projectRoadmapItems, viewer } = await getProjectPageData(
    routeParams["project-id"],
  );
  const idea = await getProjectIdeaById(viewer.id, project.id, routeParams["idea-id"]);

  if (!idea) {
    notFound();
  }

  return (
    <IdeaWorkspace
      idea={{
        context: idea.context,
        createdAt: idea.createdAt.toISOString(),
        createdByName: idea.createdByName,
        id: idea.id,
        roadmapItemId: idea.roadmapItemId,
        sourceVisionId: idea.sourceVisionId,
        sourceVisionTitle: idea.sourceVisionTitle,
        specSheet: idea.specSheet,
        title: idea.title,
        updatedAt: idea.updatedAt.toISOString(),
        userStories: idea.userStories,
      }}
      projectId={project.id}
      roadmapItems={projectRoadmapItems}
    />
  );
}
