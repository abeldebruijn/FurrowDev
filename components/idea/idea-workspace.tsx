"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { VisionUpdatedAt } from "@/app/project/[project-id]/ideas/vision-updated-at";

type IdeaStory = {
  id: string;
  outcome: string;
  story: string;
};

type IdeaWorkspaceProps = {
  idea: {
    context: string;
    createdAt: string;
    createdByName: string;
    id: string;
    roadmapItemId: string | null;
    sourceVisionId: string;
    sourceVisionTitle: string;
    specSheet: string;
    title: string;
    updatedAt: string;
    userStories: IdeaStory[];
  };
  projectId: string;
  roadmapItems: Array<{
    description: string | null;
    id: string;
    majorVersion: number;
    minorVersion: number;
    name: string;
  }>;
};

type IdeaWorkspaceSnapshot = {
  context: string;
  roadmapItemId: string | null;
  specSheet: string;
  userStories: IdeaStory[];
};

type IdeaWorkspacePatch = Partial<IdeaWorkspaceSnapshot>;

/**
 * Create an editable snapshot of an idea containing only the fields persisted by the workspace.
 *
 * @param idea - Source idea object used to derive the editable snapshot
 * @returns An IdeaWorkspaceSnapshot with `context`, `roadmapItemId`, `specSheet`, and `userStories`
 */
function createSnapshot(idea: IdeaWorkspaceProps["idea"]): IdeaWorkspaceSnapshot {
  return {
    context: idea.context,
    roadmapItemId: idea.roadmapItemId,
    specSheet: idea.specSheet,
    userStories: idea.userStories,
  };
}

/**
 * Produce a unique string identifier for a user story.
 *
 * @returns A unique string identifier suitable for use as a story id.
 */
function createStoryId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `story-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Determines whether two arrays of idea stories are equal after trimming whitespace.
 *
 * @param left - First list of stories to compare
 * @param right - Second list of stories to compare
 * @returns `true` if both lists have the same length and each story at the same index has identical `id`, `story`, and `outcome` after trimming whitespace, `false` otherwise.
 */
function areStoriesEqual(left: IdeaStory[], right: IdeaStory[]) {
  const normalizedLeft = normalizeStories(left);
  const normalizedRight = normalizeStories(right);

  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }

  return normalizedLeft.every((story, index) => {
    const target = normalizedRight[index];

    if (!target) {
      return false;
    }

    return (
      story.id === target.id && story.story === target.story && story.outcome === target.outcome
    );
  });
}

/**
 * Produce a new array of stories with leading and trailing whitespace removed from each field.
 *
 * @param stories - The list of stories to normalize; each returned story will have `id`, `outcome`, and `story` trimmed.
 * @returns An array of `IdeaStory` objects whose `id`, `outcome`, and `story` values have been trimmed.
 */
function normalizeStories(stories: IdeaStory[]): IdeaStory[] {
  return stories.map((story) => ({
    id: story.id.trim(),
    outcome: story.outcome.trim(),
    story: story.story.trim(),
  }));
}

/**
 * Create a patch object containing only fields that differ between two snapshots.
 *
 * @param current - The current editable snapshot to compare
 * @param baseline - The baseline snapshot to compare against (typically the last-saved snapshot)
 * @returns An object with only the keys that changed; when `userStories` changed, its value is the normalized story array
 */
function buildPatch(
  current: IdeaWorkspaceSnapshot,
  baseline: IdeaWorkspaceSnapshot,
): IdeaWorkspacePatch {
  const patch: IdeaWorkspacePatch = {};

  if (current.context !== baseline.context) {
    patch.context = current.context;
  }

  if (current.roadmapItemId !== baseline.roadmapItemId) {
    patch.roadmapItemId = current.roadmapItemId;
  }

  if (current.specSheet !== baseline.specSheet) {
    patch.specSheet = current.specSheet;
  }

  if (!areStoriesEqual(current.userStories, baseline.userStories)) {
    // Match server-side normalization to avoid autosave loops on trimmed values.
    patch.userStories = normalizeStories(current.userStories);
  }

  return patch;
}

/**
 * Render an editable workspace for an idea with debounced autosave, manual save, and story editing.
 *
 * Displays editors for context (markdown with preview), spec sheet, roadmap item selection, and user stories;
 * automatically persists changes after a short debounce and allows an explicit "Save changes" action.
 *
 * @param props.idea - The initial idea data used to populate editors and create the baseline snapshot
 * @param props.projectId - The project identifier used for API requests when saving changes
 * @param props.roadmapItems - Roadmap items shown in the roadmap item selector
 * @returns A React element rendering the idea workspace UI
 */
export function IdeaWorkspace({ idea, projectId, roadmapItems }: IdeaWorkspaceProps) {
  const router = useRouter();
  const debounceMs = 700;
  const [context, setContext] = useState(idea.context);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [roadmapItemId, setRoadmapItemId] = useState(idea.roadmapItemId ?? "");
  const [specSheet, setSpecSheet] = useState(idea.specSheet);
  const [userStories, setUserStories] = useState<IdeaStory[]>(idea.userStories);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<IdeaWorkspaceSnapshot>(
    createSnapshot(idea),
  );
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [autosaveError, setAutosaveError] = useState<string | null>(null);
  const isAutoSaveInFlightRef = useRef(false);
  const shouldAutoSaveAgainRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentSnapshot = useMemo<IdeaWorkspaceSnapshot>(
    () => ({
      context,
      roadmapItemId: roadmapItemId || null,
      specSheet,
      userStories,
    }),
    [context, roadmapItemId, specSheet, userStories],
  );
  const hasUnsavedChanges = useMemo(
    () => Object.keys(buildPatch(currentSnapshot, lastSavedSnapshot)).length > 0,
    [currentSnapshot, lastSavedSnapshot],
  );

  useEffect(() => {
    const nextSnapshot = createSnapshot(idea);

    setContext(idea.context);
    setRoadmapItemId(idea.roadmapItemId ?? "");
    setSpecSheet(idea.specSheet);
    setUserStories(idea.userStories);
    setLastSavedSnapshot(nextSnapshot);
    setLastSavedAt(null);
    setAutosaveError(null);
  }, [idea]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  function updateStory(storyId: string, patch: Partial<IdeaStory>) {
    setUserStories((current) =>
      current.map((story) => (story.id === storyId ? { ...story, ...patch } : story)),
    );
  }

  function removeStory(storyId: string) {
    setUserStories((current) => current.filter((story) => story.id !== storyId));
  }

  function addStory() {
    setUserStories((current) => [
      ...current,
      {
        id: createStoryId(),
        outcome: "",
        story: "",
      },
    ]);
  }

  async function persistPatch(patch: IdeaWorkspacePatch) {
    const response = await fetch(`/api/project/${projectId}/ideas/idea/${idea.id}`, {
      body: JSON.stringify(patch),
      headers: {
        "content-type": "application/json",
      },
      method: "PATCH",
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error || "Failed to save idea.");
    }

    const data = (await response.json().catch(() => null)) as {
      idea?: {
        context: string;
        roadmapItemId: string | null;
        specSheet: string;
        userStories: IdeaStory[];
      };
    } | null;

    if (data?.idea) {
      setLastSavedSnapshot({
        context: data.idea.context,
        roadmapItemId: data.idea.roadmapItemId,
        specSheet: data.idea.specSheet,
        userStories: data.idea.userStories,
      });
    } else {
      setLastSavedSnapshot((current) => ({
        ...current,
        ...patch,
      }));
    }

    setLastSavedAt(new Date().toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" }));
  }

  async function runAutoSave() {
    const patch = buildPatch(currentSnapshot, lastSavedSnapshot);

    if (Object.keys(patch).length === 0) {
      return;
    }

    if (isAutoSaveInFlightRef.current) {
      shouldAutoSaveAgainRef.current = true;
      return;
    }

    isAutoSaveInFlightRef.current = true;
    setIsAutoSaving(true);
    setAutosaveError(null);

    try {
      await persistPatch(patch);
    } catch (error) {
      setAutosaveError(error instanceof Error ? error.message : "Failed to autosave idea.");
    } finally {
      isAutoSaveInFlightRef.current = false;
      setIsAutoSaving(false);

      if (shouldAutoSaveAgainRef.current) {
        shouldAutoSaveAgainRef.current = false;
        void runAutoSave();
      }
    }
  }

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      void runAutoSave();
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [currentSnapshot, hasUnsavedChanges, lastSavedSnapshot]);

  async function handleSave() {
    if (isSaving) {
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const patch = buildPatch(currentSnapshot, lastSavedSnapshot);

      if (Object.keys(patch).length === 0) {
        return;
      }

      await persistPatch(patch);
      setAutosaveError(null);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to save idea.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="mb-12 flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mt-1 text-xl font-semibold text-foreground">{idea.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {isAutoSaving ? (
            <span className="text-xs text-muted-foreground">Autosaving...</span>
          ) : hasUnsavedChanges ? (
            <span className="text-xs text-muted-foreground">Unsaved changes</span>
          ) : lastSavedAt ? (
            <span className="text-xs text-muted-foreground">{`Saved at ${lastSavedAt}`}</span>
          ) : null}

          <LinkButton href={`/project/${projectId}/ideas`} variant="outline">
            Back to ideas
          </LinkButton>
          <Button disabled={isSaving} onClick={handleSave} type="button">
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 mb-4 md:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Source vision</p>
          <LinkButton
            className="mt-1 h-auto px-0 py-0 text-left text-sm font-medium"
            href={`/project/${projectId}/visions/vision/${idea.sourceVisionId}`}
            variant="link"
          >
            {idea.sourceVisionTitle}
          </LinkButton>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">Created by</p>
          <p className="mt-1 text-sm">{idea.createdByName}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">Created</p>
          <p className="mt-1 text-sm">
            <VisionUpdatedAt isoString={idea.createdAt} />
          </p>
        </div>
        <div className="col-span-2">
          <p className="text-xs font-medium text-muted-foreground">Roadmap Item</p>
          <select
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring"
            onChange={(event) => setRoadmapItemId(event.target.value)}
            value={roadmapItemId}
          >
            <option value="">None</option>
            {roadmapItems.map((item) => (
              <option key={item.id} value={item.id}>
                {`v${item.majorVersion}.${item.minorVersion} - ${item.name}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Tabs className="w-full" defaultValue="text">
        <div className="flex flex-row items-end justify-between gap-3">
          <div>Idea Context</div>
          <TabsList>
            <TabsTrigger value="text">Text</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
        </div>
        <div>
          <TabsContent value="text">
            <textarea
              className="min-h-48 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              onChange={(event) => setContext(event.target.value)}
              placeholder="Write Idea Context in markdown."
              value={context}
            />
          </TabsContent>
          <TabsContent value="preview">
            <div className="min-h-20 rounded-xl border bg-muted/30 px-3 py-2">
              <MarkdownContent className="flex flex-col gap-3 text-sm" text={context} />
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <div>
        <div className="mb-2">Spec Sheet</div>
        <textarea
          className="min-h-48 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
          onChange={(event) => setSpecSheet(event.target.value)}
          value={specSheet}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Stories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {userStories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No user stories yet.</p>
          ) : (
            userStories.map((story, index) => (
              <div className="space-y-2 rounded-xl border p-3" key={story.id}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{`Story ${index + 1}`}</p>
                  <Button
                    onClick={() => removeStory(story.id)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Remove
                  </Button>
                </div>
                <Input
                  onChange={(event) => updateStory(story.id, { story: event.target.value })}
                  placeholder="As a user, I want..."
                  value={story.story}
                />
                <textarea
                  className="min-h-24 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                  onChange={(event) => updateStory(story.id, { outcome: event.target.value })}
                  placeholder="So that..."
                  value={story.outcome}
                />
              </div>
            ))
          )}
          <Button onClick={addStory} type="button" variant="outline">
            Add story
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Idea Conversation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            Idea conversation will appear here.
          </div>
          <textarea
            className="min-h-24 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            disabled
            placeholder="Composer shell (not persisted in issue #9)."
          />
          <Button disabled type="button" variant="outline">
            Send (coming soon)
          </Button>
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Save failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {autosaveError ? (
        <Alert variant="destructive">
          <AlertTitle>Autosave failed</AlertTitle>
          <AlertDescription>{autosaveError}</AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}
