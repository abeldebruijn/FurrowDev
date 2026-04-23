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
        isDone: idea.isDone,
        roadmapItemId: idea.roadmapItemId,
        sourceVisionId: idea.sourceVisionId,
        sourceVisionTitle: idea.sourceVisionTitle,
        specSheet: idea.specSheet,
        tasks: idea.tasks.map((task) => ({
          ...task,
          createdAt: task.createdAt.toISOString(),
          subtasks: task.subtasks.map((subtask) => ({
            ...subtask,
            completedAt: subtask.completedAt?.toISOString() ?? null,
            createdAt: subtask.createdAt.toISOString(),
            updatedAt: subtask.updatedAt.toISOString(),
          })),
          updatedAt: task.updatedAt.toISOString(),
        })),
        title: idea.title,
        updatedAt: idea.updatedAt.toISOString(),
        userStories: idea.userStories,
      }}
      projectId={project.id}
      roadmapItems={projectRoadmapItems}
    />
  );
}
