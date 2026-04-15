import { notFound } from "next/navigation";

import { VisionWorkspace } from "@/components/vision/vision-workspace";
import {
  getAccessibleVision,
  getVisionCollaborators,
  getVisionMessages,
  listEligibleVisionCollaborators,
} from "@/lib/vision/server";

import { getProjectPageData } from "../../project-page-data";

type VisionPageProps = {
  params: Promise<{
    "project-id": string;
    "vision-id": string;
  }>;
};

export default async function VisionPage({ params }: VisionPageProps) {
  const routeParams = await params;
  const { project, viewer } = await getProjectPageData(routeParams["project-id"]);
  const vision = await getAccessibleVision(viewer.id, project.id, routeParams["vision-id"]);

  if (!vision) {
    notFound();
  }

  const [messages, collaborators, eligibleCollaborators] = await Promise.all([
    getVisionMessages(vision.id),
    getVisionCollaborators(vision.id),
    listEligibleVisionCollaborators(viewer.id, project.id),
  ]);

  return (
    <VisionWorkspace
      eligibleCollaborators={eligibleCollaborators}
      initialCollaborators={collaborators.map((collaborator) => ({
        name: collaborator.name,
        userId: collaborator.userId,
      }))}
      initialMessages={messages.map((message) => ({
        content: message.content,
        id: message.id,
        role: message.role,
      }))}
      ownerName={vision.ownerName}
      ownerUserId={vision.ownerUserId}
      projectId={project.id}
      title={vision.title}
      viewerId={viewer.id}
      visionId={vision.id}
    />
  );
}
