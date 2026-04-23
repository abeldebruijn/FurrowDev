import { notFound } from "next/navigation";

import { IdeaSpecEditor } from "@/components/idea/idea-spec-editor";
import { getIdeaById } from "@/lib/idea/server";

import { getProjectPageData } from "../../../project-page-data";

type IdeaPageProps = {
  params: Promise<{
    "idea-id": string;
    "project-id": string;
  }>;
};

export default async function ProjectIdeaPage({ params }: IdeaPageProps) {
  const routeParams = await params;
  const { project, viewer } = await getProjectPageData(routeParams["project-id"]);
  const idea = await getIdeaById(viewer.id, project.id, routeParams["idea-id"]);

  if (!idea) {
    notFound();
  }

  return (
    <IdeaSpecEditor
      context={idea.context}
      ideaId={idea.id}
      projectId={project.id}
      sourceVisionTitle={idea.sourceVisionTitle}
      specSheet={idea.specSheet}
      title={idea.title}
      userStories={idea.userStories}
    />
  );
}
