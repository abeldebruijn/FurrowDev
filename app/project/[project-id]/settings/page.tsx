import { notFound } from "next/navigation";

import { ProjectSettingsPage as ProjectSettingsView } from "@/components/project/project-settings-page";
import { listProjectMaintainers, listViewerOwnedOrganisations } from "@/lib/project/server";

import { getProjectPageData } from "../project-page-data";

type ProjectSettingsPageProps = {
  params: Promise<{
    "project-id": string;
  }>;
};

export default async function ProjectSettingsPage({ params }: ProjectSettingsPageProps) {
  const routeParams = await params;
  const { project, viewer } = await getProjectPageData(routeParams["project-id"]);

  if (!project.canViewProjectSettings) {
    notFound();
  }

  const [maintainers, ownedOrganisations] = await Promise.all([
    listProjectMaintainers(viewer.id, project.id),
    project.canMoveOwnership ? listViewerOwnedOrganisations(viewer.id) : Promise.resolve([]),
  ]);

  return (
    <ProjectSettingsView
      maintainers={maintainers}
      ownedOrganisations={ownedOrganisations}
      project={project}
    />
  );
}
