export type VisionWorkspaceProps = {
  eligibleCollaborators: Array<{
    id: string;
    name: string;
  }>;
  initialCollaborators: Array<{
    name: string;
    userId: string;
  }>;
  initialMessages: Array<{
    content: string;
    id: string;
    role: "assistant" | "user";
  }>;
  ownerName: string;
  ownerUserId: string;
  projectId: string;
  title: string;
  viewerId: string;
  visionId: string;
};
