import { notFound } from "next/navigation";

import { getProjectPageData } from "../project-page-data";

type ProjectSettingsPageProps = {
  params: Promise<{
    "project-id": string;
  }>;
};

export default async function ProjectSettingsPage({ params }: ProjectSettingsPageProps) {
  const routeParams = await params;
  const { project } = await getProjectPageData(routeParams["project-id"]);

  if (!project.canViewSettings) {
    notFound();
  }

  return <p className="text-sm text-muted-foreground">you are on the settings page</p>;
}
