"use client";

import { useEffect, useRef, useState } from "react";

const AUTO_FOLLOW_BOTTOM_THRESHOLD_PX = 500;
const AUTO_SCROLL_COMPOSER_GAP_PX = 16;

export function getComposerOffsetForAutoScroll(composerHeight: number) {
  return composerHeight + AUTO_SCROLL_COMPOSER_GAP_PX;
}

export function isAtBottomForAutoScroll(args: {
  innerHeight: number;
  scrollHeight: number;
  scrollY: number;
}) {
  const scrollBottom = args.scrollY + args.innerHeight;

  return args.scrollHeight - scrollBottom <= AUTO_FOLLOW_BOTTOM_THRESHOLD_PX;
}

export function shouldStopAutoFollow(args: {
  isFollowing: boolean;
  isSubmitting: boolean;
  nextIsAtBottom: boolean;
}) {
  return args.isSubmitting && args.isFollowing && !args.nextIsAtBottom;
}

export function shouldScrollAfterFinishedMessage(args: {
  hasPendingFinishedScroll: boolean;
  isSubmitting: boolean;
  nextLatestFinishedMessageId: string | null;
  previousLatestFinishedMessageId: string | null;
}) {
  return !(
    !args.previousLatestFinishedMessageId ||
    args.previousLatestFinishedMessageId === args.nextLatestFinishedMessageId ||
    args.isSubmitting ||
    !args.hasPendingFinishedScroll
  );
}

export function useChatAutoScroll(args: {
  isSubmitting: boolean;
  latestFinishedMessageId?: string;
  latestTransientMessageContent?: string;
  layoutVersion?: boolean | number | string | null;
  messageCount: number;
}) {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const contentShellRef = useRef<HTMLDivElement | null>(null);
  const composerFormRef = useRef<HTMLFormElement | null>(null);
  const composerShellRef = useRef<HTMLDivElement | null>(null);
  const followCurrentTypingSessionRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const pendingFinishedMessageScrollRef = useRef(false);
  const isAtBottomRef = useRef(true);
  const latestFinishedMessageIdRef = useRef<string | null>(null);
  const wasSubmittingRef = useRef(false);

  function getComposerOffset() {
    const composerHeight = composerShellRef.current?.offsetHeight ?? 0;

    return getComposerOffsetForAutoScroll(composerHeight);
  }

  function computeIsAtBottom() {
    return isAtBottomForAutoScroll({
      innerHeight: window.innerHeight,
      scrollHeight: document.documentElement.scrollHeight,
      scrollY: window.scrollY,
    });
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
  }, [args.layoutVersion, isAtBottom]);

  useEffect(() => {
    function handleScroll() {
      const nextIsAtBottom = computeIsAtBottom();

      if (
        shouldStopAutoFollow({
          isFollowing: followCurrentTypingSessionRef.current,
          isSubmitting: args.isSubmitting,
          nextIsAtBottom,
        })
      ) {
        followCurrentTypingSessionRef.current = false;
        pendingFinishedMessageScrollRef.current = false;
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
  }, [args.layoutVersion, args.messageCount]);

  useEffect(() => {
    if (args.isSubmitting && !wasSubmittingRef.current) {
      const shouldFollowCurrentTypingSession =
        followCurrentTypingSessionRef.current || computeIsAtBottom();

      followCurrentTypingSessionRef.current = shouldFollowCurrentTypingSession;
      pendingFinishedMessageScrollRef.current = shouldFollowCurrentTypingSession;
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
  }, [args.isSubmitting, args.latestTransientMessageContent]);

  useEffect(() => {
    const nextLatestFinishedMessageId = args.latestFinishedMessageId ?? null;
    const previousLatestFinishedMessageId = latestFinishedMessageIdRef.current;

    latestFinishedMessageIdRef.current = nextLatestFinishedMessageId;

    if (
      !shouldScrollAfterFinishedMessage({
        hasPendingFinishedScroll: pendingFinishedMessageScrollRef.current,
        isSubmitting: args.isSubmitting,
        nextLatestFinishedMessageId,
        previousLatestFinishedMessageId,
      })
    ) {
      return;
    }

    pendingFinishedMessageScrollRef.current = false;

    window.requestAnimationFrame(() => {
      scrollToBottom();
    });
  }, [args.isSubmitting, args.latestFinishedMessageId]);

  return {
    composerFormRef,
    composerShellRef,
    contentShellRef,
    followCurrentTypingSessionRef,
    isAtBottom,
    messagesEndRef,
    pendingFinishedMessageScrollRef,
    scrollToBottom,
  };
}
