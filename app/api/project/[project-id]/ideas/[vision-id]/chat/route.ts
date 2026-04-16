import { createAgentUIStreamResponse, type UIMessage } from "ai";
import type { NextRequest } from "next/server";

import { createVisionAgent } from "@/lib/agents/vision";
import {
  appendVisionMessage,
  getAccessibleVision,
  getVisionMessages,
  refreshVisionSummaryDocument,
} from "@/lib/vision/server";
import { getDb } from "@/lib/db";
import { getProjectAccess, getProjectRoadmap, getProjectRoadmapItems } from "@/lib/project/server";
import { upsertViewerFromWorkOSSession } from "@/lib/zero/context";
import { getWorkOSSession } from "@/lib/workos-session";

type VisionChatRouteProps = {
  params: Promise<{
    "project-id": string;
    "vision-id": string;
  }>;
};

function getLastUserText(messages: unknown[]) {
  const lastMessage = messages.at(-1);

  if (!lastMessage || typeof lastMessage !== "object") {
    return null;
  }

  const role = "role" in lastMessage ? lastMessage.role : null;
  const id = "id" in lastMessage && typeof lastMessage.id === "string" ? lastMessage.id : null;
  const parts = "parts" in lastMessage && Array.isArray(lastMessage.parts) ? lastMessage.parts : [];

  if (role !== "user" || !id) {
    return null;
  }

  const text = parts
    .flatMap((part) =>
      part && typeof part === "object" && "type" in part && part.type === "text" && "text" in part
        ? [typeof part.text === "string" ? part.text : ""]
        : [],
    )
    .join("")
    .trim();

  if (!text) {
    return null;
  }

  return {
    id,
    text,
  };
}

function toUIMessages(
  transcript: Array<{
    content: string;
    id: string;
    role: "assistant" | "user";
  }>,
): UIMessage[] {
  return transcript.map((message) => ({
    id: message.id,
    parts: [
      {
        text: message.content,
        type: "text",
      },
    ],
    role: message.role,
  }));
}

export async function POST(request: NextRequest, { params }: VisionChatRouteProps) {
  const session = await getWorkOSSession(request);

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const viewer = await upsertViewerFromWorkOSSession(session);
  const { ["project-id"]: projectId, ["vision-id"]: visionId } = await params;
  const rawBody = await request.json().catch(() => null);

  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if ("messages" in rawBody && !Array.isArray(rawBody.messages)) {
    return Response.json({ error: "Invalid messages payload." }, { status: 400 });
  }

  const submittedMessage = getLastUserText(
    "messages" in rawBody && Array.isArray(rawBody.messages) ? rawBody.messages : [],
  );

  if (!submittedMessage) {
    return Response.json({ error: "Missing user message." }, { status: 400 });
  }

  const db = getDb();
  const vision = await getAccessibleVision(viewer.id, projectId, visionId, db);

  if (!vision) {
    return Response.json({ error: "Vision not found." }, { status: 404 });
  }

  await db.transaction(async (tx) => {
    const existingMessage = (await getVisionMessages(visionId, tx)).find(
      (message) => message.id === submittedMessage.id,
    );

    if (!existingMessage) {
      await appendVisionMessage(tx, {
        authorUserId: viewer.id,
        content: submittedMessage.text,
        id: submittedMessage.id,
        role: "user",
        visionId,
      });
    }
  });

  const [freshVision, freshTranscript, project] = await Promise.all([
    getAccessibleVision(viewer.id, projectId, visionId, db),
    getVisionMessages(visionId, db),
    getProjectAccess(viewer.id, projectId, db),
  ]);

  if (!freshVision || !project) {
    return Response.json({ error: "Vision not found." }, { status: 404 });
  }

  const [roadmap, roadmapItems] = await Promise.all([
    getProjectRoadmap(project.roadmapId, db),
    getProjectRoadmapItems(project.roadmapId, db),
  ]);

  const agent = createVisionAgent({
    onFinish: async (message) => {
      await db.transaction(async (tx) => {
        await appendVisionMessage(tx, {
          content: message,
          role: "assistant",
          visionId,
        });
      });

      await refreshVisionSummaryDocument(visionId, db);
    },
    project: {
      description: project.description,
      ubiquitousLanguageMarkdown: project.ubiquitousLanguageMarkdown,
    },
    roadmap,
    roadmapItems,
    vision: {
      summary: freshVision.summary,
      title: freshVision.title,
    },
  });

  return createAgentUIStreamResponse({
    abortSignal: request.signal,
    agent,
    uiMessages: toUIMessages(freshTranscript),
  });
}
