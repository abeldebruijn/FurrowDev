"use client";

import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useChatAutoScroll } from "@/components/chat/use-chat-auto-scroll";
import type { VisionAgentUIMessage } from "@/lib/agents/vision";

import { buildRenderMessages } from "./vision-workspace-messages";
import type { VisionWorkspaceProps } from "./vision-workspace-types";
import { VisionWorkspaceView } from "./vision-workspace-view";

export function VisionWorkspace({
  eligibleCollaborators,
  initialCollaborators,
  initialMessages,
  ownerName,
  ownerUserId,
  projectId,
  roadmapItems,
  summary,
  title,
  viewerId,
  visionId,
}: VisionWorkspaceProps) {
  const router = useRouter();
  const [currentTitle, setCurrentTitle] = useState(title);
  const [input, setInput] = useState("");
  const [collaborators, setCollaborators] = useState(initialCollaborators);
  const [routeError, setRouteError] = useState<string | null>(null);
  const canManageCollaborators = viewerId === ownerUserId;

  useEffect(() => {
    setCollaborators(initialCollaborators);
  }, [initialCollaborators]);

  useEffect(() => {
    setCurrentTitle(title);
  }, [title]);

  const {
    error,
    messages: transientMessages,
    sendMessage,
    setMessages,
    status,
  } = useChat<VisionAgentUIMessage>({
    onFinish: async () => {
      setMessages([]);
      const response = await fetch(`/api/project/${projectId}/visions/${visionId}/conversion`);
      const data = (await response.json().catch(() => null)) as {
        converted?: boolean;
      } | null;

      if (data?.converted) {
        router.push(`/project/${projectId}/ideas`);
        router.refresh();
        return;
      }

      router.refresh();
    },
    transport: new DefaultChatTransport({
      api: `/api/project/${projectId}/visions/${visionId}/chat`,
    }),
  });

  const messages = useMemo(
    () =>
      buildRenderMessages({
        persistedMessages: initialMessages,
        transientMessages,
      }),
    [initialMessages, transientMessages],
  );
  const isSubmitting = status === "submitted" || status === "streaming";
  const latestTransientAssistantMessage = useMemo(
    () =>
      [...messages]
        .reverse()
        .find((message) => message.role === "assistant" && message.isTransient),
    [messages],
  );
  const latestFinishedAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === "assistant" && !message.isTransient);
  const {
    composerFormRef,
    composerShellRef,
    contentShellRef,
    followCurrentTypingSessionRef,
    isAtBottom,
    messagesEndRef,
    pendingFinishedMessageScrollRef,
    scrollToBottom,
  } = useChatAutoScroll({
    isSubmitting,
    latestFinishedMessageId: latestFinishedAssistantMessage?.id,
    latestTransientMessageContent: latestTransientAssistantMessage?.content,
    layoutVersion: canManageCollaborators,
    messageCount: messages.length,
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextInput = input.trim();

    if (!nextInput) {
      return;
    }

    setRouteError(null);
    setInput("");
    followCurrentTypingSessionRef.current = true;
    pendingFinishedMessageScrollRef.current = true;
    scrollToBottom();

    const sendMessagePromise = sendMessage({
      id: crypto.randomUUID(),
      parts: [
        {
          text: nextInput,
          type: "text",
        },
      ],
      role: "user",
    });

    window.requestAnimationFrame(() => {
      scrollToBottom();
    });

    await sendMessagePromise;
  }

  function handleComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!(event.metaKey || event.ctrlKey) || event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    composerFormRef.current?.requestSubmit();
  }

  async function mutateCollaborator(userId: string, method: "DELETE" | "POST") {
    setRouteError(null);

    const response = await fetch(`/api/project/${projectId}/visions/${visionId}/collaborators`, {
      body: JSON.stringify({ userId }),
      headers: {
        "content-type": "application/json",
      },
      method,
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error || "Collaborator update failed.");
    }

    const matchingUser =
      eligibleCollaborators.find((user) => user.id === userId) ??
      collaborators.find((collaborator) => collaborator.userId === userId);

    if (!matchingUser) {
      router.refresh();
      return;
    }

    setCollaborators((current) =>
      method === "POST"
        ? [...current, { name: matchingUser.name, userId }]
        : current.filter((collaborator) => collaborator.userId !== userId),
    );
  }

  return (
    <VisionWorkspaceView
      canManageCollaborators={canManageCollaborators}
      collaborators={collaborators}
      composerFormRef={composerFormRef}
      composerShellRef={composerShellRef}
      contentShellRef={contentShellRef}
      currentTitle={currentTitle}
      eligibleCollaborators={eligibleCollaborators}
      input={input}
      isAtBottom={isAtBottom}
      isSubmitting={isSubmitting}
      messages={messages}
      messagesEndRef={messagesEndRef}
      onAddCollaborator={(userId) => mutateCollaborator(userId, "POST")}
      onComposerKeyDown={handleComposerKeyDown}
      onInputChange={setInput}
      onRemoveCollaborator={(userId) => mutateCollaborator(userId, "DELETE")}
      onSubmit={handleSubmit}
      onTitleChange={setCurrentTitle}
      ownerName={ownerName}
      ownerUserId={ownerUserId}
      projectId={projectId}
      roadmapItems={roadmapItems}
      routeError={routeError}
      scrollToBottom={scrollToBottom}
      sendError={error}
      summary={summary}
      visionId={visionId}
    />
  );
}
