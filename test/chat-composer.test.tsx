import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vite-plus/test";

vi.mock("@/components/ui/button", () => ({
  Button: ({
    "aria-label": ariaLabel,
    children,
    disabled,
  }: {
    "aria-label"?: string;
    children: React.ReactNode;
    disabled?: boolean;
  }) => (
    <button aria-label={ariaLabel} disabled={disabled}>
      {children}
    </button>
  ),
}));

import { ChatComposer } from "../components/chat/chat-composer";

describe("ChatComposer", () => {
  it("renders header, helper content, footer, and the scroll button", () => {
    const markup = renderToStaticMarkup(
      <ChatComposer
        composerFormRef={{ current: null }}
        composerShellRef={{ current: null }}
        footer={<div>Footer slot</div>}
        header={<div>Header slot</div>}
        helperContent={<div>Helper text</div>}
        input="Hello"
        inputId="shared-chat-input"
        inputLabel="Shared chat input"
        isAtBottom={false}
        isSubmitDisabled={false}
        isSubmitting={false}
        onInputChange={() => {}}
        onKeyDown={() => {}}
        onScrollToBottom={() => {}}
        onSubmit={() => {}}
        placeholder="Type here"
      />,
    );

    expect(markup).toContain("Header slot");
    expect(markup).toContain("Helper text");
    expect(markup).toContain("Footer slot");
    expect(markup).toContain("Scroll to latest message");
    expect(markup).toContain("Type here");
    expect(markup).toContain("Send");
  });
});
