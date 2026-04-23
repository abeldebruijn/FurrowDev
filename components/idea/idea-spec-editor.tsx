"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MarkdownContent } from "@/components/ui/markdown-content";

type UserStoryInput = {
  id: string;
  outcome: string;
  story: string;
};

type IdeaSpecEditorProps = {
  context: string;
  ideaId: string;
  projectId: string;
  sourceVisionTitle: string;
  specSheet: string;
  title: string;
  userStories: UserStoryInput[];
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function serializeUserStories(userStories: UserStoryInput[]) {
  return JSON.stringify(userStories, null, 2);
}

function parseUserStories(rawValue: string): UserStoryInput[] {
  const parsed = JSON.parse(rawValue);

  if (!Array.isArray(parsed)) {
    throw new Error("User stories must be a JSON array.");
  }

  return parsed.map((story, index) => {
    if (
      !story ||
      typeof story !== "object" ||
      typeof story.id !== "string" ||
      typeof story.outcome !== "string" ||
      typeof story.story !== "string"
    ) {
      throw new Error(`Invalid user story at index ${index}.`);
    }

    return {
      id: story.id,
      outcome: story.outcome,
      story: story.story,
    };
  });
}

export function IdeaSpecEditor({
  context,
  ideaId,
  projectId,
  sourceVisionTitle,
  specSheet,
  title,
  userStories,
}: IdeaSpecEditorProps) {
  const router = useRouter();
  const [draftSpecSheet, setDraftSpecSheet] = useState(specSheet);
  const [draftUserStories, setDraftUserStories] = useState(serializeUserStories(userStories));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegeneratingSpec, setIsRegeneratingSpec] = useState(false);
  const [isRegeneratingStories, setIsRegeneratingStories] = useState(false);

  useEffect(() => {
    setDraftSpecSheet(specSheet);
  }, [specSheet]);

  useEffect(() => {
    setDraftUserStories(serializeUserStories(userStories));
  }, [userStories]);

  const route = useMemo(
    () => `/api/project/${projectId}/ideas/idea/${ideaId}/spec`,
    [ideaId, projectId],
  );

  async function handleSave() {
    setError(null);
    setIsSaving(true);

    try {
      const parsedUserStories = parseUserStories(draftUserStories);
      const response = await fetch(route, {
        body: JSON.stringify({
          specSheet: draftSpecSheet,
          userStories: parsedUserStories,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "PATCH",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Failed to save idea documents.");
      }

      router.refresh();
    } catch (nextError) {
      setError(getErrorMessage(nextError, "Failed to save idea documents."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRegenerate(kind: "specSheet" | "userStories") {
    setError(null);

    if (kind === "specSheet") {
      setIsRegeneratingSpec(true);
    } else {
      setIsRegeneratingStories(true);
    }

    try {
      const response = await fetch(route, {
        body: JSON.stringify({
          [kind]: true,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Failed to regenerate idea documents.");
      }

      router.refresh();
    } catch (nextError) {
      setError(getErrorMessage(nextError, "Failed to regenerate idea documents."));
    } finally {
      if (kind === "specSheet") {
        setIsRegeneratingSpec(false);
      } else {
        setIsRegeneratingStories(false);
      }
    }
  }

  return (
    <div className="mb-12 flex flex-col gap-4">
      <section className="space-y-1">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">Source vision: {sourceVisionTitle}</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Idea context</CardTitle>
          <CardDescription>Regeneration uses this context and keeps it unchanged.</CardDescription>
        </CardHeader>
        <CardContent>
          <MarkdownContent
            className="flex flex-col gap-3 text-sm"
            text={context || "No context."}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Spec sheet</CardTitle>
            <CardDescription>PRD-style markdown used for issue breakdown.</CardDescription>
          </div>
          <Button
            disabled={isRegeneratingSpec || isSaving || isRegeneratingStories}
            onClick={() => handleRegenerate("specSheet")}
            type="button"
            variant="outline"
          >
            {isRegeneratingSpec ? "Regenerating..." : "Regenerate"}
          </Button>
        </CardHeader>
        <CardContent>
          <textarea
            aria-label="Spec sheet"
            className="min-h-80 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            onChange={(event) => setDraftSpecSheet(event.target.value)}
            value={draftSpecSheet}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>User stories</CardTitle>
            <CardDescription>Actor-goal-benefit statements.</CardDescription>
          </div>
          <Button
            disabled={isRegeneratingStories || isSaving || isRegeneratingSpec}
            onClick={() => handleRegenerate("userStories")}
            type="button"
            variant="outline"
          >
            {isRegeneratingStories ? "Regenerating..." : "Regenerate"}
          </Button>
        </CardHeader>
        <CardContent>
          <textarea
            aria-label="User stories"
            className="min-h-56 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            onChange={(event) => setDraftUserStories(event.target.value)}
            value={draftUserStories}
          />
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Update failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div>
        <Button
          disabled={isSaving || isRegeneratingSpec || isRegeneratingStories}
          onClick={handleSave}
          type="button"
        >
          {isSaving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
