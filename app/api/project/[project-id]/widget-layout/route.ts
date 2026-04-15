import { z } from "zod";
import type { NextRequest } from "next/server";

import { saveAccessibleProjectWidgetLayout } from "@/lib/project/server";
import { upsertViewerFromWorkOSSession } from "@/lib/zero/context";
import { getWorkOSSession } from "@/lib/workos-session";

type ProjectWidgetLayoutRouteProps = {
  params: Promise<{
    "project-id": string;
  }>;
};

const saveWidgetLayoutSchema = z.object({
  largeLayout: z.array(
    z.object({
      hSize: z.int().positive(),
      wSize: z.int().positive(),
      widgetName: z.string().trim().min(1),
      xPos: z.int().min(0),
      yPos: z.int().min(0),
    }),
  ),
});

export async function PUT(request: NextRequest, { params }: ProjectWidgetLayoutRouteProps) {
  const session = await getWorkOSSession(request);

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const viewer = await upsertViewerFromWorkOSSession(session);
  const { ["project-id"]: projectId } = await params;
  const rawBody = await request.json().catch(() => null);

  if (rawBody === null) {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const body = saveWidgetLayoutSchema.safeParse(rawBody);

  if (!body.success) {
    return Response.json({ error: "Invalid widget layout." }, { status: 400 });
  }

  const result = await saveAccessibleProjectWidgetLayout(
    viewer.id,
    projectId,
    body.data.largeLayout,
  );

  if (result.error === "not_found") {
    return Response.json({ error: "Project not found." }, { status: 404 });
  }

  if (result.error === "forbidden") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return Response.json({ ok: true });
}
