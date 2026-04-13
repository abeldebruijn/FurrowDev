import { getProjectPageData } from "../project-page-data";

type ProjectIdeasPageProps = {
  params: Promise<{
    "project-id": string;
  }>;
};

export default async function ProjectIdeasPage({ params }: ProjectIdeasPageProps) {
  const routeParams = await params;
  await getProjectPageData(routeParams["project-id"]);

  return <p className="text-sm text-muted-foreground">you are on the ideas page</p>;
}
