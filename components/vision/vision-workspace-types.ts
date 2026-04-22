export type VisionWorkspaceProps = {
  canConvertToIdea: boolean;
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
  roadmapItems: Array<{
    description: string | null;
    id: string;
    majorVersion: number;
    minorVersion: number;
    name: string;
  }>;
  summary: string;
  title: string;
  viewerId: string;
  visionId: string;
};
