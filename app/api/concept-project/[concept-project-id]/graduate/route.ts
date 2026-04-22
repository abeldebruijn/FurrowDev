import type { NextRequest } from "next/server";

import { graduateConceptProjectToProject } from "@/lib/project/server";
import { getPostHogClient } from "@/lib/posthog-server";
import { upsertViewerFromWorkOSSession } from "@/lib/zero/context";
import { getWorkOSSession } from "@/lib/workos-session";

type ConceptProjectGraduateRouteProps = {
  params: Promise<{
    "concept-project-id": string;
  }>;
};

export async function POST(request: NextRequest, { params }: ConceptProjectGraduateRouteProps) {
  const session = await getWorkOSSession(request);

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const viewer = await upsertViewerFromWorkOSSession(session);
  const { ["concept-project-id"]: conceptProjectId } = await params;

  try {
    const project = await graduateConceptProjectToProject(viewer.id, conceptProjectId);

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: viewer.id,
      event: "concept_project_graduated",
      properties: {
        concept_project_id: conceptProjectId,
        project_id: project.id,
      },
    });
    await posthog.shutdown();

    return Response.json({ ok: true, projectId: project.id });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Failed to graduate concept project.",
      },
      { status: 400 },
    );
  }
}
