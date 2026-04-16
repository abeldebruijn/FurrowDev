import { describe, expect, it } from "vite-plus/test";

import {
  getComposerOffsetForAutoScroll,
  isAtBottomForAutoScroll,
  shouldScrollAfterFinishedMessage,
  shouldStopAutoFollow,
} from "../components/chat/use-chat-auto-scroll";

describe("useChatAutoScroll helpers", () => {
  it("detects when the viewport is near the bottom threshold", () => {
    expect(
      isAtBottomForAutoScroll({
        innerHeight: 400,
        scrollHeight: 1000,
        scrollY: 0,
      }),
    ).toBe(false);

    expect(
      isAtBottomForAutoScroll({
        innerHeight: 400,
        scrollHeight: 1000,
        scrollY: 150,
      }),
    ).toBe(true);
  });

  it("stops following only when a followed stream moves away from the bottom", () => {
    expect(
      shouldStopAutoFollow({
        isFollowing: true,
        isSubmitting: true,
        nextIsAtBottom: false,
      }),
    ).toBe(true);

    expect(
      shouldStopAutoFollow({
        isFollowing: true,
        isSubmitting: true,
        nextIsAtBottom: true,
      }),
    ).toBe(false);
  });

  it("scrolls after a newer finished message lands following a pending stream", () => {
    expect(
      shouldScrollAfterFinishedMessage({
        hasPendingFinishedScroll: true,
        isSubmitting: false,
        nextLatestFinishedMessageId: "assistant-2",
        previousLatestFinishedMessageId: "assistant-1",
      }),
    ).toBe(true);

    expect(
      shouldScrollAfterFinishedMessage({
        hasPendingFinishedScroll: true,
        isSubmitting: false,
        nextLatestFinishedMessageId: "assistant-1",
        previousLatestFinishedMessageId: "assistant-1",
      }),
    ).toBe(false);
  });

  it("includes composer gap in the shared offset calculation", () => {
    expect(getComposerOffsetForAutoScroll(64)).toBe(80);
  });
});
