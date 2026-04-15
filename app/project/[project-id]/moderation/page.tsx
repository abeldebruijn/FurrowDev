import { notFound } from "next/navigation";

import { getProjectPageData } from "../project-page-data";

type ProjectModerationPageProps = {
  params: Promise<{
    "project-id": string;
  }>;
};

export default async function ProjectModerationPage({ params }: ProjectModerationPageProps) {
  const routeParams = await params;
  const { project } = await getProjectPageData(routeParams["project-id"]);

  if (!project.canViewModeration) {
    notFound();
  }

  return <p className="text-sm text-muted-foreground">you are on the moderation page</p>;
}
