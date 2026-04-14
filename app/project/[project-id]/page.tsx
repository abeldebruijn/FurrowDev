import type { Metadata } from "next";

import { getProjectPageData } from "./project-page-data";
import { WidgetLayout } from "@/components/widgets/widget-layout";

type ProjectPageProps = {
  params: Promise<{
    "project-id": string;
  }>;
  searchParams: Promise<{
    widgetEdit?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Project | FurrowDev",
  description: "View a graduated FurrowDev project.",
};

function getDescription(description: string | null) {
  return description?.trim() || "No description yet.";
}

export default async function ProjectPage({ params, searchParams }: ProjectPageProps) {
  const routeParams = await params;
  const { project } = await getProjectPageData(routeParams["project-id"]);
  const { widgetEdit } = await searchParams;
  const isWidgetEdit = widgetEdit === "true" || widgetEdit === "1";

  return (
    <>
      <section className="flex flex-col gap-2">
        <p className="text-base leading-7 text-foreground">{getDescription(project.description)}</p>
      </section>

      <WidgetLayout layout={project.layout} projectId={project.id} widgetEdit={isWidgetEdit} />
    </>
  );
}
