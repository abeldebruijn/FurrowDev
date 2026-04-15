import { getProjectPageData } from "../project-page-data";

type ProjectMergesPageProps = {
  params: Promise<{
    "project-id": string;
  }>;
};

export default async function ProjectMergesPage({ params }: ProjectMergesPageProps) {
  const routeParams = await params;
  await getProjectPageData(routeParams["project-id"]);

  return <p className="text-sm text-muted-foreground">you are on the merges page</p>;
}
