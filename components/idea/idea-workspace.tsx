"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MarkdownContent } from "@/components/ui/markdown-content";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { VisionUpdatedAt } from "@/app/project/[project-id]/ideas/vision-updated-at";

type IdeaStory = {
  id: string;
  outcome: string;
  story: string;
};

type IdeaMetadata = Record<string, unknown>;

type IdeaDependency = {
  id: string;
  title: string;
};

type IdeaSubtask = {
  completedAt: string | null;
  createdAt: string;
  dependencies: IdeaDependency[];
  description: string;
  id: string;
  isDone: boolean;
  metadata: IdeaMetadata;
  position: number;
  taskId: string;
  title: string;
  updatedAt: string;
};

type IdeaTask = {
  createdAt: string;
  dependencies: IdeaDependency[];
  description: string;
  id: string;
  ideaId: string;
  isDone: boolean;
  metadata: IdeaMetadata;
  position: number;
  subtasks: IdeaSubtask[];
  title: string;
  updatedAt: string;
};

type IdeaWorkspaceProps = {
  idea: {
    context: string;
    createdAt: string;
    createdByName: string;
    id: string;
    isDone: boolean;
    roadmapItemId: string | null;
    sourceVisionId: string;
    sourceVisionTitle: string;
    specSheet: string;
    tasks: IdeaTask[];
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

type TaskDraft = {
  dependencyIds: string[];
  description: string;
  metadataText: string;
  title: string;
};

type SubtaskDraft = TaskDraft & {
  completed: boolean;
};

type GeneratedTaskTitle = {
  key: string;
  title: string;
};

type GeneratedSubtaskDraft = {
  dependencies: string[];
  description: string;
  key: string;
  metadata: IdeaMetadata;
  title: string;
};

type GeneratedTaskDraft = {
  dependencies: string[];
  description: string;
  key: string;
  metadata: IdeaMetadata;
  subtasks: GeneratedSubtaskDraft[];
  title: string;
};

type GeneratedTaskApplyMode = "append" | "replace_all" | "replace_empty";

type TaskGenerationPhase =
  | "idle"
  | "generating_titles"
  | "review_titles"
  | "refining_titles"
  | "generating_details"
  | "review_details"
  | "saving"
  | "saved";

function createSnapshot(idea: IdeaWorkspaceProps["idea"]): IdeaWorkspaceSnapshot {
  return {
    context: idea.context,
    roadmapItemId: idea.roadmapItemId,
    specSheet: idea.specSheet,
    userStories: idea.userStories,
  };
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeStories(stories: IdeaStory[]): IdeaStory[] {
  return stories.map((story) => ({
    id: story.id.trim(),
    outcome: story.outcome.trim(),
    story: story.story.trim(),
  }));
}

function areStoriesEqual(left: IdeaStory[], right: IdeaStory[]) {
  const normalizedLeft = normalizeStories(left);
  const normalizedRight = normalizeStories(right);

  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }

  return normalizedLeft.every((story, index) => {
    const target = normalizedRight[index];

    return (
      target &&
      story.id === target.id &&
      story.story === target.story &&
      story.outcome === target.outcome
    );
  });
}

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
    patch.userStories = normalizeStories(current.userStories);
  }

  return patch;
}

function formatMetadata(metadata: IdeaMetadata) {
  return JSON.stringify(metadata, null, 2);
}

function parseMetadata(text: string) {
  const value = text.trim() ? JSON.parse(text) : {};

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Metadata must be a JSON object.");
  }

  return value as IdeaMetadata;
}

function buildTaskDrafts(tasks: IdeaTask[]) {
  return Object.fromEntries(
    tasks.map((task) => [
      task.id,
      {
        dependencyIds: task.dependencies.map((dependency) => dependency.id),
        description: task.description,
        metadataText: formatMetadata(task.metadata),
        title: task.title,
      },
    ]),
  );
}

function buildSubtaskDrafts(tasks: IdeaTask[]) {
  return Object.fromEntries(
    tasks.flatMap((task) =>
      task.subtasks.map((subtask) => [
        subtask.id,
        {
          completed: subtask.isDone,
          dependencyIds: subtask.dependencies.map((dependency) => dependency.id),
          description: subtask.description,
          metadataText: formatMetadata(subtask.metadata),
          title: subtask.title,
        },
      ]),
    ),
  );
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
  const [showAllStories, setShowAllStories] = useState(false);
  const [ideaDone, setIdeaDone] = useState(idea.isDone);
  const [tasks, setTasks] = useState<IdeaTask[]>(idea.tasks);
  const [taskDrafts, setTaskDrafts] = useState<Record<string, TaskDraft>>(() =>
    buildTaskDrafts(idea.tasks),
  );
  const [subtaskDrafts, setSubtaskDrafts] = useState<Record<string, SubtaskDraft>>(() =>
    buildSubtaskDrafts(idea.tasks),
  );
  const [newSubtaskTitles, setNewSubtaskTitles] = useState<Record<string, string>>({});
  const [taskError, setTaskError] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isGenerateTasksOpen, setIsGenerateTasksOpen] = useState(false);
  const [taskGenerationPhase, setTaskGenerationPhase] = useState<TaskGenerationPhase>("idle");
  const [generatedTaskTitles, setGeneratedTaskTitles] = useState<GeneratedTaskTitle[]>([]);
  const [generatedTaskDetails, setGeneratedTaskDetails] = useState<GeneratedTaskDraft[]>([]);
  const [taskGenerationError, setTaskGenerationError] = useState<string | null>(null);
  const [generatedTaskApplyMode, setGeneratedTaskApplyMode] =
    useState<GeneratedTaskApplyMode>("append");
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<IdeaWorkspaceSnapshot>(() =>
    createSnapshot(idea),
  );
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [autosaveError, setAutosaveError] = useState<string | null>(null);
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
  const visibleStories = showAllStories ? userStories : userStories.slice(0, 5);
  const hiddenStoryCount = userStories.length - visibleStories.length;
  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, tasks],
  );
  const isGeneratingTasks =
    taskGenerationPhase === "generating_titles" ||
    taskGenerationPhase === "refining_titles" ||
    taskGenerationPhase === "generating_details" ||
    taskGenerationPhase === "saving";
  const taskGenerationSteps = [
    {
      label: "Reading idea context",
      status: taskGenerationPhase === "idle" ? "pending" : "done",
    },
    {
      label: "Generating task titles",
      status:
        taskGenerationPhase === "generating_titles"
          ? "active"
          : generatedTaskTitles.length > 0
            ? "done"
            : "pending",
    },
    {
      label: "Waiting for title review",
      status:
        taskGenerationPhase === "review_titles" || taskGenerationPhase === "refining_titles"
          ? "active"
          : generatedTaskDetails.length > 0 || taskGenerationPhase === "saved"
            ? "done"
            : "pending",
    },
    {
      label: "Generating subtasks and details",
      status:
        taskGenerationPhase === "generating_details"
          ? "active"
          : generatedTaskDetails.length > 0 || taskGenerationPhase === "saved"
            ? "done"
            : "pending",
    },
  ];

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
    setShowAllStories(true);
    setUserStories((current) => [
      ...current,
      {
        id: createId("story"),
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
      idea?: Pick<IdeaWorkspaceSnapshot, "context" | "roadmapItemId" | "specSheet" | "userStories">;
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

    setIsAutoSaving(true);
    setAutosaveError(null);

    try {
      await persistPatch(patch);
    } catch (error) {
      setAutosaveError(error instanceof Error ? error.message : "Failed to autosave idea.");
    }

    setIsAutoSaving(false);
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

    const patch = buildPatch(currentSnapshot, lastSavedSnapshot);

    if (Object.keys(patch).length === 0) {
      setIsSaving(false);
      return;
    }

    try {
      await persistPatch(patch);
      setAutosaveError(null);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to save idea.");
    }

    setIsSaving(false);
  }

  async function mutateTasks(path: string, method: string, body?: unknown) {
    setTaskError(null);

    const response = await fetch(path, {
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      method,
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error || "Failed to update tasks.");
    }

    const data = ((await response.json().catch(() => null)) ?? {}) as {
      idea?: { isDone: boolean; tasks: IdeaTask[] };
    };

    if (!data.idea) {
      throw new Error("Unexpected response from server.");
    }

    setIdeaDone(data.idea.isDone);
    setTasks(data.idea.tasks);
    setTaskDrafts(buildTaskDrafts(data.idea.tasks));
    setSubtaskDrafts(buildSubtaskDrafts(data.idea.tasks));
    router.refresh();
  }

  async function postTaskGeneration<T>(path: string, body?: unknown) {
    const response = await fetch(path, {
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      method: "POST",
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error || "Failed to generate tasks.");
    }

    return ((await response.json().catch(() => null)) ?? {}) as T;
  }

  async function handleOpenTaskGeneration() {
    setIsGenerateTasksOpen(true);
    setTaskGenerationError(null);
    setGeneratedTaskTitles([]);
    setGeneratedTaskDetails([]);
    setGeneratedTaskApplyMode("append");
    setTaskGenerationPhase("generating_titles");

    try {
      const data = await postTaskGeneration<{ tasks?: GeneratedTaskTitle[] }>(
        `/api/project/${projectId}/ideas/idea/${idea.id}/tasks/generate/titles`,
      );

      if (!data.tasks) {
        setTaskGenerationError("Unexpected response from server.");
        setTaskGenerationPhase("idle");
        return;
      }

      setGeneratedTaskTitles(data.tasks);
      setTaskGenerationPhase("review_titles");
    } catch (error) {
      setTaskGenerationError(error instanceof Error ? error.message : "Failed to generate tasks.");
      setTaskGenerationPhase("idle");
    }
  }

  async function handleRefineGeneratedTaskTitles(direction: "more_abstract" | "more_detailed") {
    setTaskGenerationError(null);
    setTaskGenerationPhase("refining_titles");

    try {
      const data = await postTaskGeneration<{ tasks?: GeneratedTaskTitle[] }>(
        `/api/project/${projectId}/ideas/idea/${idea.id}/tasks/generate/refine`,
        {
          direction,
          tasks: generatedTaskTitles,
        },
      );

      if (!data.tasks) {
        setTaskGenerationError("Unexpected response from server.");
        setTaskGenerationPhase("review_titles");
        return;
      }

      setGeneratedTaskTitles(data.tasks);
      setTaskGenerationPhase("review_titles");
    } catch (error) {
      setTaskGenerationError(error instanceof Error ? error.message : "Failed to refine tasks.");
      setTaskGenerationPhase("review_titles");
    }
  }

  function handleMoveGeneratedTaskTitle(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= generatedTaskTitles.length) {
      return;
    }

    setGeneratedTaskTitles((current) => {
      const reordered = [...current];
      const currentTask = reordered[index];
      const nextTask = reordered[nextIndex];

      if (!currentTask || !nextTask) {
        return current;
      }

      reordered[index] = nextTask;
      reordered[nextIndex] = currentTask;

      return reordered;
    });
  }

  async function handleGenerateTaskDetails() {
    setTaskGenerationError(null);
    setTaskGenerationPhase("generating_details");

    try {
      const data = await postTaskGeneration<{ tasks?: GeneratedTaskDraft[] }>(
        `/api/project/${projectId}/ideas/idea/${idea.id}/tasks/generate/details`,
        {
          tasks: generatedTaskTitles,
        },
      );

      if (!data.tasks) {
        setTaskGenerationError("Unexpected response from server.");
        setTaskGenerationPhase("review_titles");
        return;
      }

      setGeneratedTaskDetails(data.tasks);
      setTaskGenerationPhase("review_details");
    } catch (error) {
      setTaskGenerationError(
        error instanceof Error ? error.message : "Failed to generate task details.",
      );
      setTaskGenerationPhase("review_titles");
    }
  }

  async function handleApplyGeneratedTasks() {
    setTaskGenerationError(null);
    setTaskGenerationPhase("saving");

    const mode = tasks.length === 0 ? "append" : generatedTaskApplyMode;

    try {
      const data = await postTaskGeneration<{ idea?: { isDone: boolean; tasks: IdeaTask[] } }>(
        `/api/project/${projectId}/ideas/idea/${idea.id}/tasks/generate/apply`,
        {
          mode,
          tasks: generatedTaskDetails,
        },
      );

      if (!data.idea) {
        setTaskGenerationError("Unexpected response from server.");
        setTaskGenerationPhase("review_details");
        return;
      }

      setIdeaDone(data.idea.isDone);
      setTasks(data.idea.tasks);
      setTaskDrafts(buildTaskDrafts(data.idea.tasks));
      setSubtaskDrafts(buildSubtaskDrafts(data.idea.tasks));
      setTaskGenerationPhase("saved");
      setIsGenerateTasksOpen(false);
      router.refresh();
    } catch (error) {
      setTaskGenerationError(error instanceof Error ? error.message : "Failed to save tasks.");
      setTaskGenerationPhase("review_details");
    }
  }

  async function handleSaveTask(task: IdeaTask) {
    const draft = taskDrafts[task.id];

    if (!draft) {
      return;
    }

    try {
      await mutateTasks(
        `/api/project/${projectId}/ideas/idea/${idea.id}/tasks/${task.id}`,
        "PATCH",
        {
          dependencies: draft.dependencyIds,
          description: draft.description,
          metadata: parseMetadata(draft.metadataText),
          title: draft.title,
        },
      );
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : "Failed to save task.");
    }
  }

  async function handleDeleteTask(task: IdeaTask) {
    try {
      await mutateTasks(
        `/api/project/${projectId}/ideas/idea/${idea.id}/tasks/${task.id}`,
        "DELETE",
      );
      setSelectedTaskId(null);
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : "Failed to delete task.");
    }
  }

  async function handleAddSubtask(task: IdeaTask) {
    const title = newSubtaskTitles[task.id]?.trim() || "Untitled subtask";

    try {
      await mutateTasks(
        `/api/project/${projectId}/ideas/idea/${idea.id}/tasks/${task.id}/subtasks`,
        "POST",
        {
          title,
        },
      );
      setNewSubtaskTitles((current) => ({ ...current, [task.id]: "" }));
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : "Failed to create subtask.");
    }
  }

  async function handleSaveSubtask(task: IdeaTask, subtask: IdeaSubtask) {
    const draft = subtaskDrafts[subtask.id];

    if (!draft) {
      return;
    }

    try {
      await mutateTasks(
        `/api/project/${projectId}/ideas/idea/${idea.id}/tasks/${task.id}/subtasks/${subtask.id}`,
        "PATCH",
        {
          completed: draft.completed,
          dependencies: draft.dependencyIds,
          description: draft.description,
          metadata: parseMetadata(draft.metadataText),
          title: draft.title,
        },
      );
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : "Failed to save subtask.");
    }
  }

  async function handleDeleteSubtask(task: IdeaTask, subtask: IdeaSubtask) {
    try {
      await mutateTasks(
        `/api/project/${projectId}/ideas/idea/${idea.id}/tasks/${task.id}/subtasks/${subtask.id}`,
        "DELETE",
      );
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : "Failed to delete subtask.");
    }
  }

  return (
    <section className="mb-12 flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-muted-foreground">
            {ideaDone ? "Done" : "Not done"}
          </div>
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

      <div className="mb-4 grid gap-3 md:grid-cols-2">
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

      <Tabs className="order-4 w-full" defaultValue="text">
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

      <Tabs className="order-3 w-full" defaultValue="text">
        <div className="flex flex-row items-end justify-between gap-3">
          <div>Spec Sheet</div>
          <TabsList>
            <TabsTrigger value="text">Text</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
        </div>
        <div>
          <TabsContent value="text">
            <textarea
              className="min-h-48 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              onChange={(event) => setSpecSheet(event.target.value)}
              placeholder="Write the spec sheet in markdown."
              value={specSheet}
            />
          </TabsContent>
          <TabsContent value="preview">
            <div className="min-h-20 rounded-xl border bg-muted/30 px-3 py-2">
              <MarkdownContent className="flex flex-col gap-3 text-sm" text={specSheet} />
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <div className="order-2">
        <div className="mb-2">User Stories</div>
        <div className="space-y-3">
          {userStories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No user stories yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table className="min-w-[680px] table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-9 px-2">User story</TableHead>
                    <TableHead className="h-9 px-2">Outcome</TableHead>
                    <TableHead className="h-9 w-24 px-2 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleStories.map((story) => (
                    <TableRow key={story.id}>
                      <TableCell className="p-2 align-top">
                        <p className="line-clamp-4 text-sm">
                          {story.story || "No user story provided."}
                        </p>
                      </TableCell>
                      <TableCell className="p-2 align-top">
                        <p className="line-clamp-4 text-sm">
                          {story.outcome || "No outcome provided."}
                        </p>
                      </TableCell>
                      <TableCell className="p-2 align-top">
                        <div className="flex flex-col gap-2">
                          <Dialog>
                            <DialogTrigger render={<Button size="sm" type="button" />}>
                              View
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl!">
                              <DialogHeader>
                                <DialogTitle>User story details</DialogTitle>
                                <DialogDescription>
                                  Edit the full story text. Changes autosave with the idea
                                  workspace.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-2">
                                  <label
                                    className="text-sm font-medium"
                                    htmlFor={`${story.id}-story`}
                                  >
                                    User story
                                  </label>
                                  <textarea
                                    className="min-h-36 w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                                    id={`${story.id}-story`}
                                    onChange={(event) =>
                                      updateStory(story.id, { story: event.target.value })
                                    }
                                    placeholder="As a user, I want..."
                                    value={story.story}
                                  />
                                </div>
                                <div className="flex flex-col gap-2">
                                  <label
                                    className="text-sm font-medium"
                                    htmlFor={`${story.id}-outcome`}
                                  >
                                    Outcome
                                  </label>
                                  <textarea
                                    className="min-h-36 w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                                    id={`${story.id}-outcome`}
                                    onChange={(event) =>
                                      updateStory(story.id, { outcome: event.target.value })
                                    }
                                    placeholder="So that..."
                                    value={story.outcome}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <DialogClose render={<Button type="button" variant="outline" />}>
                                  Close
                                </DialogClose>
                                <Button disabled={isSaving} onClick={handleSave} type="button">
                                  {isSaving ? "Saving..." : "Save changes"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <Button
                            onClick={() => removeStory(story.id)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Remove
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={addStory} type="button" variant="outline">
              Add story
            </Button>
            {userStories.length > 5 ? (
              <Button
                onClick={() => setShowAllStories((current) => !current)}
                type="button"
                variant="outline"
              >
                {showAllStories ? "Show first five" : `Show ${hiddenStoryCount} more`}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <Card className="order-1">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Tasks</CardTitle>
          <Dialog onOpenChange={setIsGenerateTasksOpen} open={isGenerateTasksOpen}>
            <DialogTrigger
              render={<Button onClick={handleOpenTaskGeneration} type="button" variant="outline" />}
            >
              Generate tasks
            </DialogTrigger>
            <DialogContent className="max-w-3xl!">
              <DialogHeader>
                <DialogTitle>Generate tasks</DialogTitle>
                <DialogDescription>
                  Review task titles before the agent generates subtasks and details.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-5">
                <div className="rounded-lg border p-3">
                  <div className="mb-2 text-sm font-medium">Agent progress</div>
                  <ol className="flex flex-col gap-2 text-sm">
                    {taskGenerationSteps.map((step) => (
                      <li className="flex items-center justify-between gap-3" key={step.label}>
                        <span>{step.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {step.status === "active"
                            ? "Working"
                            : step.status === "done"
                              ? "Done"
                              : "Pending"}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>

                {taskGenerationError ? (
                  <Alert variant="destructive">
                    <AlertTitle>Generation failed</AlertTitle>
                    <AlertDescription>{taskGenerationError}</AlertDescription>
                  </Alert>
                ) : null}

                {generatedTaskTitles.length > 0 && generatedTaskDetails.length === 0 ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-medium">Task titles</div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          disabled={isGeneratingTasks}
                          onClick={() => handleRefineGeneratedTaskTitles("more_detailed")}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          More detailed
                        </Button>
                        <Button
                          disabled={isGeneratingTasks}
                          onClick={() => handleRefineGeneratedTaskTitles("more_abstract")}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          More abstract
                        </Button>
                      </div>
                    </div>
                    <div className="flex max-h-80 flex-col gap-2 overflow-y-auto rounded-lg border p-2">
                      {generatedTaskTitles.map((task, index) => (
                        <div className="flex items-center gap-2" key={task.key}>
                          <Input
                            aria-label={`Generated task ${index + 1}`}
                            disabled={isGeneratingTasks}
                            onChange={(event) =>
                              setGeneratedTaskTitles((current) =>
                                current.map((candidate) =>
                                  candidate.key === task.key
                                    ? { ...candidate, title: event.target.value }
                                    : candidate,
                                ),
                              )
                            }
                            value={task.title}
                          />
                          <Button
                            disabled={isGeneratingTasks || index === 0}
                            onClick={() => handleMoveGeneratedTaskTitle(index, -1)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Up
                          </Button>
                          <Button
                            disabled={isGeneratingTasks || index === generatedTaskTitles.length - 1}
                            onClick={() => handleMoveGeneratedTaskTitle(index, 1)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Down
                          </Button>
                          <Button
                            disabled={isGeneratingTasks || generatedTaskTitles.length === 1}
                            onClick={() =>
                              setGeneratedTaskTitles((current) =>
                                current.filter((candidate) => candidate.key !== task.key),
                              )
                            }
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {generatedTaskDetails.length > 0 && taskGenerationPhase !== "saved" ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-medium">Generated task plan</div>
                      {tasks.length > 0 ? (
                        <select
                          className="h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring"
                          disabled={isGeneratingTasks}
                          onChange={(event) =>
                            setGeneratedTaskApplyMode(event.target.value as GeneratedTaskApplyMode)
                          }
                          value={generatedTaskApplyMode}
                        >
                          <option value="append">Append only</option>
                          <option value="replace_empty">Replace empty tasks</option>
                          <option value="replace_all">Replace all tasks</option>
                        </select>
                      ) : null}
                    </div>
                    <div className="max-h-96 overflow-y-auto rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="h-9 px-2">Task</TableHead>
                            <TableHead className="h-9 w-28 px-2 text-right">Subtasks</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {generatedTaskDetails.map((task, index) => (
                            <TableRow key={task.key}>
                              <TableCell className="p-2 align-top">
                                <p className="line-clamp-2 text-sm">
                                  {`${index + 1}. ${task.title}`}
                                </p>
                              </TableCell>
                              <TableCell className="p-2 text-right align-top text-sm text-muted-foreground">
                                {task.subtasks.length}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : null}
              </div>

              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" />}>Close</DialogClose>
                {generatedTaskDetails.length === 0 ? (
                  <Button
                    disabled={isGeneratingTasks || generatedTaskTitles.length === 0}
                    onClick={handleGenerateTaskDetails}
                    type="button"
                  >
                    Generate subtasks
                  </Button>
                ) : taskGenerationPhase === "saved" ? null : (
                  <Button
                    disabled={isGeneratingTasks}
                    onClick={handleApplyGeneratedTasks}
                    type="button"
                  >
                    {taskGenerationPhase === "saving" ? "Creating..." : "Create tasks"}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks yet. Idea is not done.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-9 px-3">Task</TableHead>
                    <TableHead className="h-9 w-52 px-3">Depends on</TableHead>
                    <TableHead className="h-9 w-28 px-3">Status</TableHead>
                    <TableHead className="h-9 w-28 px-3 text-right">Subtasks</TableHead>
                    <TableHead className="h-9 w-24 px-3 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="p-3 align-middle">
                        <p className="line-clamp-2 text-sm font-medium">{task.title}</p>
                      </TableCell>
                      <TableCell className="p-3 align-middle text-sm text-muted-foreground">
                        <p className="line-clamp-2">
                          {task.dependencies.length > 0
                            ? task.dependencies.map((dependency) => dependency.title).join(", ")
                            : "None"}
                        </p>
                      </TableCell>
                      <TableCell className="p-3 align-middle text-sm text-muted-foreground">
                        {task.isDone ? "Done" : "Not done"}
                      </TableCell>
                      <TableCell className="p-3 text-right align-middle text-sm text-muted-foreground">
                        {task.subtasks.length}
                      </TableCell>
                      <TableCell className="p-3 text-right align-middle">
                        <Button onClick={() => setSelectedTaskId(task.id)} size="sm" type="button">
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <Sheet
            onOpenChange={(open) => {
              if (!open) {
                setSelectedTaskId(null);
              }
            }}
            open={Boolean(selectedTask)}
          >
            <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
              {selectedTask ? (
                <>
                  <SheetHeader>
                    <SheetTitle>{selectedTask.title}</SheetTitle>
                    <SheetDescription>{selectedTask.isDone ? "Done" : "Not done"}</SheetDescription>
                  </SheetHeader>

                  <div className="flex flex-col gap-5 px-4 pb-4">
                    {(() => {
                      const draft = taskDrafts[selectedTask.id];

                      return draft ? (
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-col gap-2">
                            <label
                              className="text-xs font-medium text-muted-foreground"
                              htmlFor={`task-title-${selectedTask.id}`}
                            >
                              Title
                            </label>
                            <Input
                              id={`task-title-${selectedTask.id}`}
                              onChange={(event) =>
                                setTaskDrafts((current) => ({
                                  ...current,
                                  [selectedTask.id]: { ...draft, title: event.target.value },
                                }))
                              }
                              value={draft.title}
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <label
                              className="text-xs font-medium text-muted-foreground"
                              htmlFor={`task-dependencies-${selectedTask.id}`}
                            >
                              Dependencies
                            </label>
                            <select
                              className="min-h-20 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring"
                              id={`task-dependencies-${selectedTask.id}`}
                              multiple
                              onChange={(event) =>
                                setTaskDrafts((current) => ({
                                  ...current,
                                  [selectedTask.id]: {
                                    ...draft,
                                    dependencyIds: Array.from(event.target.selectedOptions).map(
                                      (option) => option.value,
                                    ),
                                  },
                                }))
                              }
                              value={draft.dependencyIds}
                            >
                              {tasks
                                .filter((candidate) => candidate.id !== selectedTask.id)
                                .map((candidate) => (
                                  <option key={candidate.id} value={candidate.id}>
                                    {candidate.title}
                                  </option>
                                ))}
                            </select>
                          </div>
                          <div className="flex flex-col gap-2">
                            <label
                              className="text-xs font-medium text-muted-foreground"
                              htmlFor={`task-description-${selectedTask.id}`}
                            >
                              Description
                            </label>
                            <textarea
                              className="min-h-24 rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                              id={`task-description-${selectedTask.id}`}
                              onChange={(event) =>
                                setTaskDrafts((current) => ({
                                  ...current,
                                  [selectedTask.id]: { ...draft, description: event.target.value },
                                }))
                              }
                              value={draft.description}
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <label
                              className="text-xs font-medium text-muted-foreground"
                              htmlFor={`task-metadata-${selectedTask.id}`}
                            >
                              Metadata
                            </label>
                            <textarea
                              className="min-h-24 rounded-xl border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-foreground"
                              id={`task-metadata-${selectedTask.id}`}
                              onChange={(event) =>
                                setTaskDrafts((current) => ({
                                  ...current,
                                  [selectedTask.id]: {
                                    ...draft,
                                    metadataText: event.target.value,
                                  },
                                }))
                              }
                              value={draft.metadataText}
                            />
                          </div>
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button onClick={() => handleSaveTask(selectedTask)} type="button">
                              Save task
                            </Button>
                            <Button
                              onClick={() => handleDeleteTask(selectedTask)}
                              type="button"
                              variant="outline"
                            >
                              Remove task
                            </Button>
                          </div>
                        </div>
                      ) : null;
                    })()}

                    <div className="flex flex-col gap-3 border-t pt-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-medium">Subtasks</h3>
                        <span className="text-xs text-muted-foreground">
                          {`${selectedTask.subtasks.filter((subtask) => subtask.isDone).length} of ${
                            selectedTask.subtasks.length
                          } done`}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          onChange={(event) =>
                            setNewSubtaskTitles((current) => ({
                              ...current,
                              [selectedTask.id]: event.target.value,
                            }))
                          }
                          placeholder="Subtask title"
                          value={newSubtaskTitles[selectedTask.id] ?? ""}
                        />
                        <Button
                          onClick={() => handleAddSubtask(selectedTask)}
                          type="button"
                          variant="outline"
                        >
                          Add subtask
                        </Button>
                      </div>

                      {selectedTask.subtasks.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No subtasks yet. Task is not done.
                        </p>
                      ) : (
                        selectedTask.subtasks.map((subtask) => {
                          const subtaskDraft = subtaskDrafts[subtask.id];

                          return (
                            <div
                              className="flex flex-col gap-3 rounded-xl border p-3"
                              key={subtask.id}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <label className="flex items-center gap-2 text-sm font-medium">
                                  <input
                                    checked={subtaskDraft?.completed ?? false}
                                    onChange={(event) =>
                                      setSubtaskDrafts((current) => ({
                                        ...current,
                                        [subtask.id]: {
                                          ...subtaskDraft!,
                                          completed: event.target.checked,
                                        },
                                      }))
                                    }
                                    type="checkbox"
                                  />
                                  {subtask.title}
                                </label>
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => handleSaveSubtask(selectedTask, subtask)}
                                    size="sm"
                                    type="button"
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    onClick={() => handleDeleteSubtask(selectedTask, subtask)}
                                    size="sm"
                                    type="button"
                                    variant="outline"
                                  >
                                    Remove
                                  </Button>
                                </div>
                              </div>

                              {subtaskDraft ? (
                                <div className="grid gap-2 md:grid-cols-2">
                                  <Input
                                    onChange={(event) =>
                                      setSubtaskDrafts((current) => ({
                                        ...current,
                                        [subtask.id]: {
                                          ...subtaskDraft,
                                          title: event.target.value,
                                        },
                                      }))
                                    }
                                    value={subtaskDraft.title}
                                  />
                                  <select
                                    className="min-h-20 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring"
                                    multiple
                                    onChange={(event) =>
                                      setSubtaskDrafts((current) => ({
                                        ...current,
                                        [subtask.id]: {
                                          ...subtaskDraft,
                                          dependencyIds: Array.from(
                                            event.target.selectedOptions,
                                          ).map((option) => option.value),
                                        },
                                      }))
                                    }
                                    value={subtaskDraft.dependencyIds}
                                  >
                                    {selectedTask.subtasks
                                      .filter((candidate) => candidate.id !== subtask.id)
                                      .map((candidate) => (
                                        <option key={candidate.id} value={candidate.id}>
                                          {candidate.title}
                                        </option>
                                      ))}
                                  </select>
                                  <textarea
                                    className="min-h-20 rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                                    onChange={(event) =>
                                      setSubtaskDrafts((current) => ({
                                        ...current,
                                        [subtask.id]: {
                                          ...subtaskDraft,
                                          description: event.target.value,
                                        },
                                      }))
                                    }
                                    placeholder="Subtask description"
                                    value={subtaskDraft.description}
                                  />
                                  <textarea
                                    className="min-h-20 rounded-xl border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-foreground"
                                    onChange={(event) =>
                                      setSubtaskDrafts((current) => ({
                                        ...current,
                                        [subtask.id]: {
                                          ...subtaskDraft,
                                          metadataText: event.target.value,
                                        },
                                      }))
                                    }
                                    value={subtaskDraft.metadataText}
                                  />
                                </div>
                              ) : null}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <SheetHeader>
                  <SheetTitle>Task details</SheetTitle>
                  <SheetDescription>Select a task to view details.</SheetDescription>
                </SheetHeader>
              )}
            </SheetContent>
          </Sheet>
        </CardContent>
      </Card>

      {error ? (
        <Alert className="order-last" variant="destructive">
          <AlertTitle>Save failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {autosaveError ? (
        <Alert className="order-last" variant="destructive">
          <AlertTitle>Autosave failed</AlertTitle>
          <AlertDescription>{autosaveError}</AlertDescription>
        </Alert>
      ) : null}

      {taskError ? (
        <Alert className="order-last" variant="destructive">
          <AlertTitle>Task update failed</AlertTitle>
          <AlertDescription>{taskError}</AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}
