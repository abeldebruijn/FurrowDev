"use client";

import { useEffect, useRef, useState } from "react";

const AUTO_FOLLOW_BOTTOM_THRESHOLD_PX = 500;
const AUTO_SCROLL_COMPOSER_GAP_PX = 16;

export function useVisionAutoScroll(args: {
  isSubmitting: boolean;
  latestFinishedAssistantMessageId?: string;
  latestTransientAssistantMessageContent?: string;
  messageCount: number;
}) {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const contentShellRef = useRef<HTMLDivElement | null>(null);
  const composerFormRef = useRef<HTMLFormElement | null>(null);
  const composerShellRef = useRef<HTMLDivElement | null>(null);
  const followCurrentTypingSessionRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const pendingFinishedAgentScrollRef = useRef(false);
  const isAtBottomRef = useRef(true);
  const latestFinishedAssistantMessageIdRef = useRef<string | null>(null);
  const wasSubmittingRef = useRef(false);

  function getComposerOffset() {
    const composerHeight = composerShellRef.current?.offsetHeight ?? 0;

    return composerHeight + AUTO_SCROLL_COMPOSER_GAP_PX;
  }

  function computeIsAtBottom() {
    const scrollBottom = window.scrollY + window.innerHeight;
    const pageBottom = document.documentElement.scrollHeight;

    return pageBottom - scrollBottom <= AUTO_FOLLOW_BOTTOM_THRESHOLD_PX;
  }

  function scrollToBottom(options?: { resumeTypingFollow?: boolean }) {
    if (options?.resumeTypingFollow && args.isSubmitting) {
      followCurrentTypingSessionRef.current = true;
    }

    window.scrollTo({
      behavior: "auto",
      top: document.documentElement.scrollHeight,
    });

    isAtBottomRef.current = true;
    setIsAtBottom(true);
  }

  useEffect(() => {
    function syncComposerOffset() {
      const nextOffset = getComposerOffset();

      if (nextOffset > 0 && contentShellRef.current) {
        contentShellRef.current.style.paddingBottom = `${nextOffset}px`;
      }
    }

    syncComposerOffset();
    window.addEventListener("resize", syncComposerOffset);

    return () => {
      window.removeEventListener("resize", syncComposerOffset);
    };
  }, [isAtBottom]);

  useEffect(() => {
    function handleScroll() {
      const nextIsAtBottom = computeIsAtBottom();

      if (args.isSubmitting && followCurrentTypingSessionRef.current && !nextIsAtBottom) {
        followCurrentTypingSessionRef.current = false;
        pendingFinishedAgentScrollRef.current = false;
      }

      isAtBottomRef.current = nextIsAtBottom;
      setIsAtBottom(nextIsAtBottom);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [args.isSubmitting]);

  useEffect(() => {
    if (contentShellRef.current) {
      contentShellRef.current.style.paddingBottom = `${getComposerOffset()}px`;
    }

    const nextIsAtBottom = computeIsAtBottom();

    isAtBottomRef.current = nextIsAtBottom;
    setIsAtBottom(nextIsAtBottom);
  }, [args.messageCount]);

  useEffect(() => {
    if (args.isSubmitting && !wasSubmittingRef.current) {
      const shouldFollowCurrentTypingSession =
        followCurrentTypingSessionRef.current || computeIsAtBottom();

      followCurrentTypingSessionRef.current = shouldFollowCurrentTypingSession;
      pendingFinishedAgentScrollRef.current = shouldFollowCurrentTypingSession;
    }

    if (!args.isSubmitting) {
      followCurrentTypingSessionRef.current = false;
    }

    wasSubmittingRef.current = args.isSubmitting;
  }, [args.isSubmitting]);

  useEffect(() => {
    if (!args.isSubmitting || !followCurrentTypingSessionRef.current) {
      return;
    }

    scrollToBottom();
  }, [args.isSubmitting, args.latestTransientAssistantMessageContent]);

  useEffect(() => {
    const nextLatestFinishedAssistantMessageId = args.latestFinishedAssistantMessageId ?? null;
    const previousLatestFinishedAssistantMessageId = latestFinishedAssistantMessageIdRef.current;

    latestFinishedAssistantMessageIdRef.current = nextLatestFinishedAssistantMessageId;

    if (
      !previousLatestFinishedAssistantMessageId ||
      previousLatestFinishedAssistantMessageId === nextLatestFinishedAssistantMessageId ||
      args.isSubmitting ||
      !pendingFinishedAgentScrollRef.current
    ) {
      return;
    }

    pendingFinishedAgentScrollRef.current = false;

    window.requestAnimationFrame(() => {
      scrollToBottom();
    });
  }, [args.isSubmitting, args.latestFinishedAssistantMessageId]);

  return {
    composerFormRef,
    composerShellRef,
    contentShellRef,
    followCurrentTypingSessionRef,
    isAtBottom,
    messagesEndRef,
    pendingFinishedAgentScrollRef,
    scrollToBottom,
  };
}
