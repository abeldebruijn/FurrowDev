import { SiteHeader } from "@/components/ui/site-header";
import { ProjectTabBar } from "@/components/project/project-tab-bar";

import { getProjectPageData } from "./project-page-data";

type ProjectLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    "project-id": string;
  }>;
};

export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const routeParams = await params;
  const projectId = routeParams["project-id"];
  const { project } = await getProjectPageData(projectId);
  const items = [
    {
      href: `/project/${projectId}`,
      label: "overview",
    },
    {
      href: `/project/${projectId}/branches`,
      label: "branches",
    },
    {
      href: `/project/${projectId}/ideas`,
      label: "ideas",
    },
    {
      href: `/project/${projectId}/merges`,
      label: "merges",
    },
    ...(project.canViewModeration
      ? [
          {
            href: `/project/${projectId}/moderation`,
            label: "moderation",
          },
        ]
      : []),
    ...(project.canViewSettings
      ? [
          {
            href: `/project/${projectId}/settings`,
            label: "settings",
          },
        ]
      : []),
  ];

  return (
    <>
      <SiteHeader back="/">{project.name.trim() || "Untitled project"}</SiteHeader>

      <main className="mx-auto flex min-h-[calc(100vh-61px)] w-full max-w-350 flex-col gap-6 px-4 py-1 sm:px-6">
        <ProjectTabBar items={items} />
        {children}
      </main>
    </>
  );
}
