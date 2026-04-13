import type { Metadata } from "next";

import { getProjectPageData } from "./project-page-data";

type ProjectPageProps = {
  params: Promise<{
    "project-id": string;
  }>;
};

export const metadata: Metadata = {
  title: "Project | FurrowDev",
  description: "View a graduated FurrowDev project.",
};

function getDescription(description: string | null) {
  return description?.trim() || "No description yet.";
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const routeParams = await params;
  const { project } = await getProjectPageData(routeParams["project-id"]);

  return (
    <section className="flex flex-col gap-2">
      <p className="text-base leading-7 text-foreground">{getDescription(project.description)}</p>
    </section>
  );
}
