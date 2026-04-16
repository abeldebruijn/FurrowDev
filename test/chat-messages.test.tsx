import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vite-plus/test";

vi.mock("@/components/ui/markdown-content", () => ({
  MarkdownContent: ({ text }: { text: string }) => <div>{text}</div>,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(" "),
}));

import { ChatMessages } from "../components/chat/chat-messages";

describe("ChatMessages", () => {
  it("renders shared assistant and user chat content with actions and trailing state", () => {
    const markup = renderToStaticMarkup(
      <ChatMessages
        messages={[
          {
            content: "Assistant reply",
            id: "assistant-1",
            isTransient: false,
            meta: {
              label: "Stage agent",
            },
            role: "assistant",
          },
          {
            content: "User reply",
            id: "user-1",
            isTransient: false,
            role: "user",
          },
        ]}
        renderAssistantLabel={(message) => <span>{message.meta?.label}</span>}
        renderMessageActions={(message) =>
          message.id === "assistant-1" ? <button type="button">Action</button> : null
        }
        renderStreamingState={<div>Thinking...</div>}
      />,
    );

    expect(markup).toContain("Assistant reply");
    expect(markup).toContain("User reply");
    expect(markup).toContain("Stage agent");
    expect(markup).toContain("Action");
    expect(markup).toContain("Thinking...");
  });
});
