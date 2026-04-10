import { createAgentUIStreamResponse, type UIMessage } from "ai";
import type { NextRequest } from "next/server";

import {
  createForWhomAgent,
  createGrillMeAgent,
  createHowAgent,
  createSetupAgent,
  createWhatAgent,
} from "@/lib/agents/concept-project";
import {
  appendConceptProjectChatMessage,
  ensureConceptProjectOpeningMessage,
  getAccessibleConceptProject,
  getConceptProjectRoadmapItems,
  getConceptProjectTranscript,
  getConceptProjectViewerName,
} from "@/lib/concept-project/server";
import {
  CONCEPT_PROJECT_GRILL_ME_AUTO_KICKOFF_MESSAGE,
  getConceptProjectWordCount,
} from "@/lib/concept-project/shared";
import { getDb } from "@/lib/db";
import { upsertViewerFromWorkOSSession } from "@/lib/zero/context";
import { getWorkOSSession } from "@/lib/workos-session";

type ConceptProjectChatRouteProps = {
  params: Promise<{
    "concept-project-id": string;
  }>;
};

function isHiddenKickoffMessage(message: string) {
  return message.trim() === CONCEPT_PROJECT_GRILL_ME_AUTO_KICKOFF_MESSAGE;
}

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
    id: string;
    message: string;
    type: "agent" | "person";
  }>,
): UIMessage[] {
  return transcript.map((message) => ({
    id: message.id,
    parts: [
      {
        text: message.message,
        type: "text",
      },
    ],
    role: message.type === "person" ? "user" : "assistant",
  }));
}

export async function POST(request: NextRequest, { params }: ConceptProjectChatRouteProps) {
  const session = await getWorkOSSession(request);

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const viewer = await upsertViewerFromWorkOSSession(session);
  const { ["concept-project-id"]: conceptProjectId } = await params;
  const body = (await request.json()) as {
    messages?: unknown[];
  };

  const submittedMessage = getLastUserText(body.messages ?? []);

  if (!submittedMessage) {
    return Response.json({ error: "Missing user message" }, { status: 400 });
  }

  const db = getDb();
  const conceptProject = await getAccessibleConceptProject(viewer.id, conceptProjectId, db);

  if (!conceptProject) {
    return Response.json({ error: "Concept project not found" }, { status: 404 });
  }

  if (conceptProject.projectId) {
    return Response.json(
      { error: "This concept project has already graduated and is now read-only." },
      { status: 400 },
    );
  }

  if (conceptProject.currentStage === "grill_me" && !conceptProject.understoodSetupAt) {
    return Response.json(
      { error: "Setup must be complete before entering grill me." },
      { status: 400 },
    );
  }

  await ensureConceptProjectOpeningMessage(conceptProject, db);

  const transcriptBeforePersist = await getConceptProjectTranscript(conceptProject.id, db);
  const isFirstUserTurn = !transcriptBeforePersist.some((message) => message.type === "person");
  const isAutoKickoffMessage = isHiddenKickoffMessage(submittedMessage.text);

  if (
    !isAutoKickoffMessage &&
    isFirstUserTurn &&
    getConceptProjectWordCount(submittedMessage.text) > 128
  ) {
    return Response.json({ error: "The first answer must be 128 words or fewer" }, { status: 400 });
  }

  const existingMessage = transcriptBeforePersist.find(
    (message) => message.id === submittedMessage.id,
  );

  if (!existingMessage && !isAutoKickoffMessage) {
    await db.transaction(async (tx) => {
      await appendConceptProjectChatMessage(tx, {
        chatId: conceptProject.chatId,
        id: submittedMessage.id,
        message: submittedMessage.text,
        stage: conceptProject.currentStage,
        type: "person",
        userId: viewer.id,
      });
    });
  }

  const [freshConceptProject, freshTranscript, viewerName] = await Promise.all([
    getAccessibleConceptProject(viewer.id, conceptProjectId, db),
    getConceptProjectTranscript(conceptProject.id, db),
    getConceptProjectViewerName(viewer.id, db),
  ]);

  if (!freshConceptProject) {
    return Response.json({ error: "Concept project not found" }, { status: 404 });
  }

  const roadmapDraft = await getConceptProjectRoadmapItems(freshConceptProject.roadmapId, db);

  const agentContext = {
    chatId: freshConceptProject.chatId,
    conceptProject: freshConceptProject,
    roadmapItems: roadmapDraft,
    viewerId: viewer.id,
    viewerName,
  };

  const agent =
    freshConceptProject.currentStage === "what"
      ? createWhatAgent(agentContext)
      : freshConceptProject.currentStage === "for_whom"
        ? createForWhomAgent(agentContext)
        : freshConceptProject.currentStage === "how"
          ? createHowAgent(agentContext)
          : freshConceptProject.currentStage === "setup"
            ? createSetupAgent(agentContext)
            : createGrillMeAgent(agentContext);

  const uiMessages = toUIMessages(freshTranscript);

  if (isAutoKickoffMessage) {
    uiMessages.push({
      id: submittedMessage.id,
      parts: [
        {
          text: submittedMessage.text,
          type: "text",
        },
      ],
      role: "user",
    });
  }

  return createAgentUIStreamResponse({
    abortSignal: request.signal,
    agent,
    uiMessages,
  });
}
