import type { VisionAgentUIMessage } from "@/lib/agents/vision";

import type { RenderMessage, VisionWorkspaceProps } from "./vision-workspace-types";

function getTextFromUIMessage(message: VisionAgentUIMessage) {
  return message.parts
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("")
    .trim();
}

export function buildRenderMessages(args: {
  persistedMessages: VisionWorkspaceProps["initialMessages"];
  transientMessages: VisionAgentUIMessage[];
}) {
  const persistedIds = new Set(args.persistedMessages.map((message) => message.id));
  const persisted: RenderMessage[] = args.persistedMessages.map((message) => ({
    content: message.content,
    id: message.id,
    isTransient: false,
    role: message.role,
  }));
  const pending: RenderMessage[] = args.transientMessages
    .filter(
      (
        message,
      ): message is VisionAgentUIMessage & {
        role: "assistant" | "user";
      } => message.role === "assistant" || message.role === "user",
    )
    .filter((message) => !persistedIds.has(message.id))
    .map((message) => ({
      content: getTextFromUIMessage(message),
      id: message.id,
      isTransient: true,
      role: message.role,
    }))
    .filter((message) => message.content.length > 0 || message.role === "assistant");

  return [...persisted, ...pending];
}
