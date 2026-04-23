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

export function IdeaWorkspace({ idea, projectId, roadmapItems }: IdeaWorkspaceProps) {
  const router = useRouter();
  const debounceMs = 700;
  const [context, setContext] = useState(idea.context);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [roadmapItemId, setRoadmapItemId] = useState(idea.roadmapItemId ?? "");
  const [specSheet, setSpecSheet] = useState(idea.specSheet);
  const [userStories, setUserStories] = useState<IdeaStory[]>(idea.userStories);
  const [ideaDone, setIdeaDone] = useState(idea.isDone);
  const [tasks, setTasks] = useState<IdeaTask[]>(idea.tasks);
  const [taskDrafts, setTaskDrafts] = useState<Record<string, TaskDraft>>(() =>
    buildTaskDrafts(idea.tasks),
  );
  const [subtaskDrafts, setSubtaskDrafts] = useState<Record<string, SubtaskDraft>>(() =>
    buildSubtaskDrafts(idea.tasks),
  );
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newSubtaskTitles, setNewSubtaskTitles] = useState<Record<string, string>>({});
  const [taskError, setTaskError] = useState<string | null>(null);
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

    const data = (await response.json()) as { idea?: { isDone: boolean; tasks: IdeaTask[] } };

    if (data.idea) {
      setIdeaDone(data.idea.isDone);
      setTasks(data.idea.tasks);
      setTaskDrafts(buildTaskDrafts(data.idea.tasks));
      setSubtaskDrafts(buildSubtaskDrafts(data.idea.tasks));
      router.refresh();
    }
  }

  async function handleAddTask() {
    const title = newTaskTitle.trim() || "Untitled task";

    try {
      await mutateTasks(`/api/project/${projectId}/ideas/idea/${idea.id}/tasks`, "POST", {
        title,
      });
      setNewTaskTitle("");
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : "Failed to create task.");
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
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : "Failed to delete task.");
    }
  }

  async function handleMoveTask(taskIndex: number, direction: -1 | 1) {
    const nextIndex = taskIndex + direction;
    const reordered = [...tasks];
    const currentTask = reordered[taskIndex];
    const nextTask = reordered[nextIndex];

    if (!currentTask || !nextTask) {
      return;
    }

    reordered[taskIndex] = nextTask;
    reordered[nextIndex] = currentTask;

    const updates = reordered.map((task, position) => ({
      body: { position },
      path: `/api/project/${projectId}/ideas/idea/${idea.id}/tasks/${task.id}`,
    }));

    for (const update of updates) {
      const failure = await mutateTasks(update.path, "PATCH", update.body)
        .then(() => null)
        .catch((error: unknown) => error);

      if (failure) {
        setTaskError(failure instanceof Error ? failure.message : "Failed to reorder tasks.");
        return;
      }
    }
  }

  async function handleAddSubtask(task: IdeaTask) {
    try {
      await mutateTasks(
        `/api/project/${projectId}/ideas/idea/${idea.id}/tasks/${task.id}/subtasks`,
        "POST",
        {
          title: newSubtaskTitles[task.id]?.trim() || "Untitled subtask",
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

  async function handleMoveSubtask(task: IdeaTask, subtaskIndex: number, direction: -1 | 1) {
    const nextIndex = subtaskIndex + direction;
    const reordered = [...task.subtasks];
    const currentSubtask = reordered[subtaskIndex];
    const nextSubtask = reordered[nextIndex];

    if (!currentSubtask || !nextSubtask) {
      return;
    }

    reordered[subtaskIndex] = nextSubtask;
    reordered[nextIndex] = currentSubtask;

    const updates = reordered.map((subtask, position) => ({
      body: { position },
      path: `/api/project/${projectId}/ideas/idea/${idea.id}/tasks/${task.id}/subtasks/${subtask.id}`,
    }));

    for (const update of updates) {
      const failure = await mutateTasks(update.path, "PATCH", update.body)
        .then(() => null)
        .catch((error: unknown) => error);

      if (failure) {
        setTaskError(failure instanceof Error ? failure.message : "Failed to reorder subtasks.");
        return;
      }
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
          <CardTitle>Tasks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              onChange={(event) => setNewTaskTitle(event.target.value)}
              placeholder="Task title"
              value={newTaskTitle}
            />
            <Button onClick={handleAddTask} type="button" variant="outline">
              Add task
            </Button>
          </div>

          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks yet. Idea is not done.</p>
          ) : (
            tasks.map((task, taskIndex) => {
              const draft = taskDrafts[task.id];

              return (
                <div className="space-y-3 rounded-xl border p-3" key={task.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{`Task ${taskIndex + 1}`}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.isDone ? "Done" : "Not done"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        disabled={taskIndex === 0}
                        onClick={() => handleMoveTask(taskIndex, -1)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Up
                      </Button>
                      <Button
                        disabled={taskIndex === tasks.length - 1}
                        onClick={() => handleMoveTask(taskIndex, 1)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Down
                      </Button>
                      <Button onClick={() => handleSaveTask(task)} size="sm" type="button">
                        Save
                      </Button>
                      <Button
                        onClick={() => handleDeleteTask(task)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>

                  {draft ? (
                    <div className="grid gap-2 md:grid-cols-2">
                      <Input
                        onChange={(event) =>
                          setTaskDrafts((current) => ({
                            ...current,
                            [task.id]: { ...draft, title: event.target.value },
                          }))
                        }
                        value={draft.title}
                      />
                      <select
                        className="min-h-20 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring"
                        multiple
                        onChange={(event) =>
                          setTaskDrafts((current) => ({
                            ...current,
                            [task.id]: {
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
                          .filter((candidate) => candidate.id !== task.id)
                          .map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                              {candidate.title}
                            </option>
                          ))}
                      </select>
                      <textarea
                        className="min-h-20 rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                        onChange={(event) =>
                          setTaskDrafts((current) => ({
                            ...current,
                            [task.id]: { ...draft, description: event.target.value },
                          }))
                        }
                        placeholder="Task description"
                        value={draft.description}
                      />
                      <textarea
                        className="min-h-20 rounded-xl border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-foreground"
                        onChange={(event) =>
                          setTaskDrafts((current) => ({
                            ...current,
                            [task.id]: { ...draft, metadataText: event.target.value },
                          }))
                        }
                        value={draft.metadataText}
                      />
                    </div>
                  ) : null}

                  <div className="space-y-3 border-t pt-3">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        onChange={(event) =>
                          setNewSubtaskTitles((current) => ({
                            ...current,
                            [task.id]: event.target.value,
                          }))
                        }
                        placeholder="SubTask title"
                        value={newSubtaskTitles[task.id] ?? ""}
                      />
                      <Button
                        onClick={() => handleAddSubtask(task)}
                        type="button"
                        variant="outline"
                      >
                        Add SubTask
                      </Button>
                    </div>

                    {task.subtasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No SubTasks yet. Task is not done.
                      </p>
                    ) : (
                      task.subtasks.map((subtask, subtaskIndex) => {
                        const subtaskDraft = subtaskDrafts[subtask.id];

                        return (
                          <div className="space-y-2 rounded-xl border p-3" key={subtask.id}>
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
                                {`SubTask ${subtaskIndex + 1}`}
                              </label>
                              <div className="flex gap-2">
                                <Button
                                  disabled={subtaskIndex === 0}
                                  onClick={() => handleMoveSubtask(task, subtaskIndex, -1)}
                                  size="sm"
                                  type="button"
                                  variant="outline"
                                >
                                  Up
                                </Button>
                                <Button
                                  disabled={subtaskIndex === task.subtasks.length - 1}
                                  onClick={() => handleMoveSubtask(task, subtaskIndex, 1)}
                                  size="sm"
                                  type="button"
                                  variant="outline"
                                >
                                  Down
                                </Button>
                                <Button
                                  onClick={() => handleSaveSubtask(task, subtask)}
                                  size="sm"
                                  type="button"
                                >
                                  Save
                                </Button>
                                <Button
                                  onClick={() => handleDeleteSubtask(task, subtask)}
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
                                        dependencyIds: Array.from(event.target.selectedOptions).map(
                                          (option) => option.value,
                                        ),
                                      },
                                    }))
                                  }
                                  value={subtaskDraft.dependencyIds}
                                >
                                  {task.subtasks
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
                                  placeholder="SubTask description"
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
              );
            })
          )}
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

      {taskError ? (
        <Alert variant="destructive">
          <AlertTitle>Task update failed</AlertTitle>
          <AlertDescription>{taskError}</AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}
