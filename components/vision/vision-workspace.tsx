"use client";

import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Users } from "lucide-react";
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
  const [collaborators, setCollaborators] = useState(initialCollaborators);
  const [routeError, setRouteError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, status]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextInput = input.trim();

    if (!nextInput) {
      return;
    }

    setRouteError(null);
    setInput("");

    await sendMessage({
      id: crypto.randomUUID(),
      parts: [
        {
          text: nextInput,
          type: "text",
        },
      ],
      role: "user",
    });
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
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/30 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground/80">
              Private vision
            </p>
            <h1 className="mt-1 text-xl font-semibold text-foreground">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Explore what this project should build next. This conversation stays private until a
              future conversion step turns it into a project idea.
            </p>
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
      </div>

      <div className="rounded-2xl border border-border/70 bg-background">
        <div className="max-h-[60vh] min-h-[50vh] space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
          {messages.map((message) => {
            const isAssistant = message.role === "assistant";

            return (
              <div
                className={isAssistant ? "mr-auto max-w-[85%]" : "ml-auto max-w-[65ch]"}
                key={message.id}
              >
                <div
                  className={
                    isAssistant
                      ? "rounded-2xl border border-border bg-muted/50 px-4 py-3"
                      : "rounded-2xl border border-foreground bg-accent px-4 py-3 text-accent-foreground"
                  }
                >
                  {isAssistant ? (
                    <p className="text-xs font-semibold font-mono text-muted-foreground">
                      Vision agent:
                    </p>
                  ) : null}
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
            );
          })}

          {isSubmitting ? (
            <div className="mr-auto max-w-[85%] rounded-2xl border border-border bg-muted/50 px-4 py-3">
              <p className="text-xs font-semibold font-mono text-muted-foreground">Vision agent:</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Thinking...</p>
            </div>
          ) : null}

          <div ref={messagesEndRef} />
        </div>

        <form className="border-t border-border/70 px-4 py-4 sm:px-6" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="vision-message-input">
            Message the vision agent
          </label>
          <textarea
            className="min-h-28 w-full rounded-xl border bg-background px-3 py-3 text-sm outline-none focus:border-foreground"
            id="vision-message-input"
            onChange={(event) => setInput(event.target.value)}
            placeholder="Describe what you want to explore, change, or validate."
            value={input}
          />

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              The hidden summary document updates after each assistant response.
            </p>
            <Button disabled={!input.trim() || isSubmitting} type="submit">
              {isSubmitting ? "Thinking..." : "Send"}
            </Button>
          </div>

          {routeError || error ? (
            <Alert className="mt-3" variant="destructive">
              <AlertTitle>Chat failed</AlertTitle>
              <AlertDescription>
                {routeError || error?.message || "Failed to send the message."}
              </AlertDescription>
            </Alert>
          ) : null}
        </form>
      </div>
    </section>
  );
}
