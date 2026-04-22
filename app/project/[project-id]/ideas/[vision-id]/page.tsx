import { redirect } from "next/navigation";

type VisionPageProps = {
  params: Promise<{
    "project-id": string;
    "vision-id": string;
  }>;
};

export default async function VisionPage({ params }: VisionPageProps) {
  const routeParams = await params;
  redirect(`/project/${routeParams["project-id"]}/visions/vision/${routeParams["vision-id"]}`);
}
