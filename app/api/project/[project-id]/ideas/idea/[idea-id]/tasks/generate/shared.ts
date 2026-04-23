import type { NextRequest } from "next/server";
import { z } from "zod";

import { upsertViewerFromWorkOSSession } from "@/lib/zero/context";
import { getWorkOSSession } from "@/lib/workos-session";

export type GeneratedTaskRouteProps = {
  params: Promise<{
    "idea-id": string;
    "project-id": string;
  }>;
};

export const generatedTaskTitleSchema = z.object({
  key: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(160),
});

export const generatedTaskDraftSchema = z.object({
  dependencies: z.array(z.string().trim().min(1).max(80)).default([]),
  description: z.string().trim().max(2000).default(""),
  key: z.string().trim().min(1).max(80),
  metadata: z.record(z.string(), z.unknown()).default({}),
  subtasks: z
    .array(
      z.object({
        dependencies: z.array(z.string().trim().min(1).max(80)).default([]),
        description: z.string().trim().max(2000).default(""),
        key: z.string().trim().min(1).max(80),
        metadata: z.record(z.string(), z.unknown()).default({}),
        title: z.string().trim().min(1).max(180),
      }),
    )
    .min(1)
    .max(12),
  title: z.string().trim().min(1).max(160),
});

export async function getGeneratedTaskRouteContext(
  request: NextRequest,
  props: GeneratedTaskRouteProps,
): Promise<
  | { response: Response; ideaId?: never; projectId?: never; viewerId?: never }
  | { ideaId: string; projectId: string; response?: never; viewerId: string }
> {
  const session = await getWorkOSSession(request);

  if (!session) {
    return { response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const viewer = await upsertViewerFromWorkOSSession(session);
  const { ["idea-id"]: ideaId, ["project-id"]: projectId } = await props.params;

  return { ideaId, projectId, viewerId: viewer.id };
}

export function getGeneratedTaskErrorResponse(
  error: "invalid_dependency" | "invalid_metadata" | "invalid_payload" | "not_found" | null,
) {
  switch (error) {
    case "invalid_dependency":
      return Response.json({ error: "Invalid generated dependency." }, { status: 400 });
    case "invalid_metadata":
      return Response.json({ error: "Invalid generated metadata." }, { status: 400 });
    case "invalid_payload":
      return Response.json({ error: "Invalid generated task payload." }, { status: 400 });
    case "not_found":
      return Response.json({ error: "Idea not found." }, { status: 404 });
    default:
      return null;
  }
}
