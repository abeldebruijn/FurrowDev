"use client";

import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownIcon, CommandIcon, CornerDownLeftIcon, Users } from "lucide-react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MarkdownContent } from "@/components/ui/markdown-content";
import type { VisionAgentUIMessage } from "@/lib/agents/vision";
import { cn } from "@/lib/utils";

type VisionWorkspaceProps = {
  eligibleCollaborators: Array<{
    id: string;
    name: string;
  }>;
  initialCollaborators: Array<{
    name: string;
    userId: string;
  }>;
  initialMessages: Array<{
    content: string;
    id: string;
    role: "assistant" | "user";
  }>;
  ownerName: string;
  ownerUserId: string;
  projectId: string;
  title: string;
  viewerId: string;
  visionId: string;
};

type RenderMessage = {
  content: string;
  id: string;
  isTransient: boolean;
  role: "assistant" | "user";
};

const AUTO_FOLLOW_BOTTOM_THRESHOLD_PX = 500;
const AUTO_SCROLL_COMPOSER_GAP_PX = 16;

function getTextFromUIMessage(message: VisionAgentUIMessage) {
  return message.parts
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("")
    .trim();
}

function buildRenderMessages(args: {
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

function VisionCollaboratorsDialog({
  canManage,
  collaborators,
  eligibleCollaborators,
  onAdd,
  onRemove,
  ownerName,
  ownerUserId,
}: {
  canManage: boolean;
  collaborators: VisionWorkspaceProps["initialCollaborators"];
  eligibleCollaborators: VisionWorkspaceProps["eligibleCollaborators"];
  onAdd: (userId: string) => Promise<void>;
  onRemove: (userId: string) => Promise<void>;
  ownerName: string;
  ownerUserId: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const collaboratorIds = useMemo(
    () => new Set(collaborators.map((collaborator) => collaborator.userId)),
    [collaborators],
  );

  const availableUsers = eligibleCollaborators.filter(
    (user) =>
      user.id !== ownerUserId &&
      !collaboratorIds.has(user.id) &&
      user.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedUserId("");
      setError(null);
      setIsSaving(false);
    }
  }, [open]);

  async function handleAdd() {
    if (!selectedUserId) {
      setError("Choose a user to add.");
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await onAdd(selectedUserId);
      setSelectedUserId("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to add collaborator.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemove(userId: string) {
    setError(null);
    setIsSaving(true);

    try {
      await onRemove(userId);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to remove collaborator.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger render={<Button type="button" variant="outline" />}>
        <Users />
        Collaborators
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vision collaborators</DialogTitle>
          <DialogDescription>
            This vision is private. Only the owner and explicitly added collaborators can view it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Owner</p>
            <div className="rounded-xl border bg-muted/40 px-3 py-2 text-sm text-foreground">
              {ownerName}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Current collaborators</p>
            {collaborators.length === 0 ? (
              <p className="text-sm text-muted-foreground">No collaborators added yet.</p>
            ) : (
              <div className="space-y-2">
                {collaborators.map((collaborator) => (
                  <div
                    className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm"
                    key={collaborator.userId}
                  >
                    <span>{collaborator.name}</span>
                    {canManage ? (
                      <Button
                        disabled={isSaving}
                        onClick={() => void handleRemove(collaborator.userId)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          {canManage ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Invite collaborator</p>
              <input
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter eligible users"
                value={query}
              />
              <select
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                onChange={(event) => setSelectedUserId(event.target.value)}
                value={selectedUserId}
              >
                <option value="">Choose a user</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Only existing users with current project access are eligible.
              </p>
            </div>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Collaborator update failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        {canManage ? (
          <DialogFooter>
            <Button disabled={isSaving} onClick={handleAdd} type="button">
              {isSaving ? "Saving..." : "Add collaborator"}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function VisionWorkspace({
  eligibleCollaborators,
  initialCollaborators,
  initialMessages,
  ownerName,
  ownerUserId,
  projectId,
  title,
  viewerId,
  visionId,
}: VisionWorkspaceProps) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [collaborators, setCollaborators] = useState(initialCollaborators);
  const [routeError, setRouteError] = useState<string | null>(null);
  const contentShellRef = useRef<HTMLDivElement | null>(null);
  const composerFormRef = useRef<HTMLFormElement | null>(null);
  const composerShellRef = useRef<HTMLDivElement | null>(null);
  const followCurrentTypingSessionRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const pendingFinishedAgentScrollRef = useRef(false);
  const isAtBottomRef = useRef(true);
  const latestFinishedAssistantMessageIdRef = useRef<string | null>(null);
  const wasSubmittingRef = useRef(false);
  const canManageCollaborators = viewerId === ownerUserId;

  useEffect(() => {
    setCollaborators(initialCollaborators);
  }, [initialCollaborators]);

  const {
    error,
    messages: transientMessages,
    sendMessage,
    setMessages,
    status,
  } = useChat<VisionAgentUIMessage>({
    onFinish: () => {
      setMessages([]);
      router.refresh();
    },
    transport: new DefaultChatTransport({
      api: `/api/project/${projectId}/ideas/${visionId}/chat`,
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
    if (options?.resumeTypingFollow && isSubmitting) {
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

      if (isSubmitting && followCurrentTypingSessionRef.current && !nextIsAtBottom) {
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
  }, [isSubmitting]);

  useEffect(() => {
    if (contentShellRef.current) {
      contentShellRef.current.style.paddingBottom = `${getComposerOffset()}px`;
    }

    const nextIsAtBottom = computeIsAtBottom();

    isAtBottomRef.current = nextIsAtBottom;
    setIsAtBottom(nextIsAtBottom);
  }, [messages.length]);

  useEffect(() => {
    if (isSubmitting && !wasSubmittingRef.current) {
      const shouldFollowCurrentTypingSession =
        followCurrentTypingSessionRef.current || computeIsAtBottom();

      followCurrentTypingSessionRef.current = shouldFollowCurrentTypingSession;
      pendingFinishedAgentScrollRef.current = shouldFollowCurrentTypingSession;
    }

    if (!isSubmitting) {
      followCurrentTypingSessionRef.current = false;
    }

    wasSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

  useEffect(() => {
    if (!isSubmitting || !followCurrentTypingSessionRef.current) {
      return;
    }

    scrollToBottom();
  }, [isSubmitting, latestTransientAssistantMessage?.content]);

  useEffect(() => {
    const nextLatestFinishedAssistantMessageId = latestFinishedAssistantMessage?.id ?? null;
    const previousLatestFinishedAssistantMessageId = latestFinishedAssistantMessageIdRef.current;

    latestFinishedAssistantMessageIdRef.current = nextLatestFinishedAssistantMessageId;

    if (
      !previousLatestFinishedAssistantMessageId ||
      previousLatestFinishedAssistantMessageId === nextLatestFinishedAssistantMessageId ||
      isSubmitting ||
      !pendingFinishedAgentScrollRef.current
    ) {
      return;
    }

    pendingFinishedAgentScrollRef.current = false;

    window.requestAnimationFrame(() => {
      scrollToBottom();
    });
  }, [isSubmitting, latestFinishedAssistantMessage?.id]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextInput = input.trim();

    if (!nextInput) {
      return;
    }

    setRouteError(null);
    setInput("");
    followCurrentTypingSessionRef.current = true;
    pendingFinishedAgentScrollRef.current = true;
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

    const response = await fetch(`/api/project/${projectId}/ideas/${visionId}/collaborators`, {
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
    <>
      <section className="grid gap-6" ref={contentShellRef}>
        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
          {messages.map((message) => {
            const isAssistant = message.role === "assistant";

            return (
              <div key={message.id} className="space-y-3">
                <div className={isAssistant ? "mr-auto max-w-[85%]" : "ml-auto max-w-[60ch]"}>
                  <div
                    className={cn(
                      "rounded-2xl border px-4 py-3",
                      isAssistant
                        ? "border-border bg-muted/50"
                        : "border-foreground bg-accent text-accent-foreground",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {isAssistant ? (
                        <span className="text-xs font-semibold font-mono text-muted-foreground">
                          Vision agent:
                        </span>
                      ) : null}
                    </div>
                    <MarkdownContent
                      className={
                        isAssistant
                          ? "mt-1 text-sm leading-6 text-muted-foreground"
                          : "mt-1 text-sm leading-6 text-foreground/80"
                      }
                      text={message.content || "..."}
                      tone={isAssistant ? "default" : "inverse"}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {isSubmitting ? (
            <div className="space-y-3">
              <div className="mr-auto max-w-[85%] rounded-2xl border border-border bg-muted/50 px-4 py-3">
                <p className="text-xs font-semibold font-mono text-muted-foreground">
                  Vision agent:
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Thinking...</p>
              </div>
            </div>
          ) : null}

          <div aria-hidden="true" ref={messagesEndRef} />
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20" ref={composerShellRef}>
        <div className="mx-auto w-full max-w-240 px-4 pb-6 sm:px-6">
          <div className="mb-3 flex h-14 justify-center">
            {!isAtBottom ? (
              <Button
                aria-label="Scroll to latest message"
                className="size-11 rounded-full shadow-md"
                onClick={() => scrollToBottom({ resumeTypingFollow: true })}
                size="icon"
                type="button"
              >
                <ArrowDownIcon className="size-5" />
              </Button>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} ref={composerFormRef}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground">{title}</div>
              </div>

              <VisionCollaboratorsDialog
                canManage={canManageCollaborators}
                collaborators={collaborators}
                eligibleCollaborators={eligibleCollaborators}
                onAdd={(userId) => mutateCollaborator(userId, "POST")}
                onRemove={(userId) => mutateCollaborator(userId, "DELETE")}
                ownerName={ownerName}
                ownerUserId={ownerUserId}
              />
            </div>

            <div className="relative rounded-lg bg-background">
              <label className="sr-only" htmlFor="vision-message-input">
                Message the vision agent
              </label>
              <textarea
                aria-label="Message the vision agent"
                className="min-h-32 w-full rounded-lg border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground"
                id="vision-message-input"
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder="Answer the current question or add more detail."
                value={input}
              />

              <Button
                className="absolute right-2 bottom-4"
                disabled={!input.trim() || isSubmitting}
                type="submit"
              >
                {isSubmitting ? (
                  "Thinking..."
                ) : (
                  <>
                    Send
                    <div className="flex">
                      <CommandIcon className="size-2.5" />
                      <CornerDownLeftIcon className="size-2.5" />
                    </div>
                  </>
                )}
              </Button>
            </div>

            {(routeError || error) && (
              <div className="flex items-center justify-between gap-3 bg-background p-2">
                <div className="space-y-1">
                  <p className="text-xs text-destructive">
                    {routeError || error?.message || "Failed to send the message."}
                  </p>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </>
  );
}
