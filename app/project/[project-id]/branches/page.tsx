import { getProjectPageData } from "../project-page-data";

type ProjectBranchesPageProps = {
  params: Promise<{
    "project-id": string;
  }>;
};

export default async function ProjectBranchesPage({ params }: ProjectBranchesPageProps) {
  const routeParams = await params;
  await getProjectPageData(routeParams["project-id"]);

  return <p className="text-sm text-muted-foreground">you are on the branches page</p>;
}
