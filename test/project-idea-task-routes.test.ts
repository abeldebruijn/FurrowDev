import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const {
  createProjectIdeaSubtask,
  createProjectIdeaTask,
  getWorkOSSession,
  reorderProjectIdeaSubtasks,
  reorderProjectIdeaTasks,
  updateProjectIdeaSubtask,
  updateProjectIdeaTask,
  upsertViewerFromWorkOSSession,
} = vi.hoisted(() => ({
  createProjectIdeaSubtask: vi.fn(),
  createProjectIdeaTask: vi.fn(),
  getWorkOSSession: vi.fn(),
  reorderProjectIdeaSubtasks: vi.fn(),
  reorderProjectIdeaTasks: vi.fn(),
  updateProjectIdeaSubtask: vi.fn(),
  updateProjectIdeaTask: vi.fn(),
  upsertViewerFromWorkOSSession: vi.fn(),
}));

vi.mock("@/lib/idea/server", () => ({
  createProjectIdeaSubtask,
  createProjectIdeaTask,
  deleteProjectIdeaSubtask: vi.fn(),
  deleteProjectIdeaTask: vi.fn(),
  reorderProjectIdeaSubtasks,
  reorderProjectIdeaTasks,
  updateProjectIdeaSubtask,
  updateProjectIdeaTask,
}));

vi.mock("@/lib/workos-session", () => ({
  getWorkOSSession,
}));

vi.mock("@/lib/zero/context", () => ({
  upsertViewerFromWorkOSSession,
}));

import { POST as POST_SUBTASK } from "../app/api/project/[project-id]/ideas/idea/[idea-id]/tasks/[task-id]/subtasks/route";
import { PATCH as PATCH_SUBTASK } from "../app/api/project/[project-id]/ideas/idea/[idea-id]/tasks/[task-id]/subtasks/[subtask-id]/route";
import { PATCH as REORDER_SUBTASKS } from "../app/api/project/[project-id]/ideas/idea/[idea-id]/tasks/[task-id]/subtasks/reorder/route";
import { PATCH as PATCH_TASK } from "../app/api/project/[project-id]/ideas/idea/[idea-id]/tasks/[task-id]/route";
import { POST as POST_TASK } from "../app/api/project/[project-id]/ideas/idea/[idea-id]/tasks/route";
import { PATCH as REORDER_TASKS } from "../app/api/project/[project-id]/ideas/idea/[idea-id]/tasks/reorder/route";

describe("project idea task routes", () => {
  beforeEach(() => {
    createProjectIdeaSubtask.mockReset();
    createProjectIdeaTask.mockReset();
    getWorkOSSession.mockReset();
    reorderProjectIdeaSubtasks.mockReset();
    reorderProjectIdeaTasks.mockReset();
    updateProjectIdeaSubtask.mockReset();
    updateProjectIdeaTask.mockReset();
    upsertViewerFromWorkOSSession.mockReset();

    getWorkOSSession.mockResolvedValue({
      user: {
        id: "workos-user-1",
      },
    });
    upsertViewerFromWorkOSSession.mockResolvedValue({
      id: "viewer-1",
    });
  });

  it("rejects unauthenticated task requests", async () => {
    getWorkOSSession.mockResolvedValueOnce(null);

    const response = await POST_TASK(
      new Request("http://localhost/api/project/project-1/ideas/idea/idea-1/tasks", {
        body: JSON.stringify({ title: "Build API" }),
        method: "POST",
      }) as any,
      {
        params: Promise.resolve({
          "idea-id": "idea-1",
          "project-id": "project-1",
        }),
      },
    );

    expect(response.status).toBe(401);
  });

  it("creates a task with metadata and dependencies", async () => {
    createProjectIdeaTask.mockResolvedValue({
      error: null,
      idea: {
        id: "idea-1",
        tasks: [],
      },
    });

    const response = await POST_TASK(
      new Request("http://localhost/api/project/project-1/ideas/idea/idea-1/tasks", {
        body: JSON.stringify({
          dependencies: ["550e8400-e29b-41d4-a716-446655440000"],
          metadata: { assignee: "agent" },
          title: "Build API",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }) as any,
      {
        params: Promise.resolve({
          "idea-id": "idea-1",
          "project-id": "project-1",
        }),
      },
    );

    expect(createProjectIdeaTask).toHaveBeenCalledWith("viewer-1", "project-1", "idea-1", {
      dependencies: ["550e8400-e29b-41d4-a716-446655440000"],
      metadata: { assignee: "agent" },
      title: "Build API",
    });
    expect(response.status).toBe(200);
  });

  it("rejects task creation without a title", async () => {
    const response = await POST_TASK(
      new Request("http://localhost/api/project/project-1/ideas/idea/idea-1/tasks", {
        body: JSON.stringify({ metadata: { assignee: "agent" } }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }) as any,
      {
        params: Promise.resolve({
          "idea-id": "idea-1",
          "project-id": "project-1",
        }),
      },
    );

    expect(createProjectIdeaTask).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
  });

  it("rejects invalid task dependencies", async () => {
    updateProjectIdeaTask.mockResolvedValue({
      error: "invalid_dependency",
      idea: null,
    });

    const response = await PATCH_TASK(
      new Request("http://localhost/api/project/project-1/ideas/idea/idea-1/tasks/task-1", {
        body: JSON.stringify({
          dependencies: ["550e8400-e29b-41d4-a716-446655440000"],
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "PATCH",
      }) as any,
      {
        params: Promise.resolve({
          "idea-id": "idea-1",
          "project-id": "project-1",
          "task-id": "task-1",
        }),
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid task dependency." });
  });

  it("creates and completes subtasks", async () => {
    createProjectIdeaSubtask.mockResolvedValue({
      error: null,
      idea: {
        id: "idea-1",
        isDone: false,
        tasks: [],
      },
    });
    updateProjectIdeaSubtask.mockResolvedValue({
      error: null,
      idea: {
        id: "idea-1",
        isDone: true,
        tasks: [],
      },
    });

    const createResponse = await POST_SUBTASK(
      new Request(
        "http://localhost/api/project/project-1/ideas/idea/idea-1/tasks/task-1/subtasks",
        {
          body: JSON.stringify({
            metadata: { category: "test" },
            title: "Write coverage",
          }),
          headers: {
            "content-type": "application/json",
          },
          method: "POST",
        },
      ) as any,
      {
        params: Promise.resolve({
          "idea-id": "idea-1",
          "project-id": "project-1",
          "task-id": "task-1",
        }),
      },
    );
    const completeResponse = await PATCH_SUBTASK(
      new Request(
        "http://localhost/api/project/project-1/ideas/idea/idea-1/tasks/task-1/subtasks/subtask-1",
        {
          body: JSON.stringify({
            completed: true,
          }),
          headers: {
            "content-type": "application/json",
          },
          method: "PATCH",
        },
      ) as any,
      {
        params: Promise.resolve({
          "idea-id": "idea-1",
          "project-id": "project-1",
          "subtask-id": "subtask-1",
          "task-id": "task-1",
        }),
      },
    );

    expect(createResponse.status).toBe(200);
    expect(completeResponse.status).toBe(200);
    expect(updateProjectIdeaSubtask).toHaveBeenCalledWith(
      "viewer-1",
      "project-1",
      "idea-1",
      "task-1",
      "subtask-1",
      { completed: true },
    );
  });

  it("rejects subtask creation without a title", async () => {
    const response = await POST_SUBTASK(
      new Request(
        "http://localhost/api/project/project-1/ideas/idea/idea-1/tasks/task-1/subtasks",
        {
          body: JSON.stringify({ metadata: { category: "test" } }),
          headers: {
            "content-type": "application/json",
          },
          method: "POST",
        },
      ) as any,
      {
        params: Promise.resolve({
          "idea-id": "idea-1",
          "project-id": "project-1",
          "task-id": "task-1",
        }),
      },
    );

    expect(createProjectIdeaSubtask).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
  });

  it("reorders tasks and subtasks through bulk endpoints", async () => {
    const firstId = "550e8400-e29b-41d4-a716-446655440000";
    const secondId = "550e8400-e29b-41d4-a716-446655440001";
    reorderProjectIdeaTasks.mockResolvedValue({
      error: null,
      idea: { id: "idea-1", tasks: [] },
    });
    reorderProjectIdeaSubtasks.mockResolvedValue({
      error: null,
      idea: { id: "idea-1", tasks: [] },
    });

    const tasksResponse = await REORDER_TASKS(
      new Request("http://localhost/api/project/project-1/ideas/idea/idea-1/tasks/reorder", {
        body: JSON.stringify({ ids: [secondId, firstId] }),
        headers: {
          "content-type": "application/json",
        },
        method: "PATCH",
      }) as any,
      {
        params: Promise.resolve({
          "idea-id": "idea-1",
          "project-id": "project-1",
        }),
      },
    );
    const subtasksResponse = await REORDER_SUBTASKS(
      new Request(
        "http://localhost/api/project/project-1/ideas/idea/idea-1/tasks/task-1/subtasks/reorder",
        {
          body: JSON.stringify({ ids: [secondId, firstId] }),
          headers: {
            "content-type": "application/json",
          },
          method: "PATCH",
        },
      ) as any,
      {
        params: Promise.resolve({
          "idea-id": "idea-1",
          "project-id": "project-1",
          "task-id": "task-1",
        }),
      },
    );

    expect(tasksResponse.status).toBe(200);
    expect(subtasksResponse.status).toBe(200);
    expect(reorderProjectIdeaTasks).toHaveBeenCalledWith("viewer-1", "project-1", "idea-1", [
      secondId,
      firstId,
    ]);
    expect(reorderProjectIdeaSubtasks).toHaveBeenCalledWith(
      "viewer-1",
      "project-1",
      "idea-1",
      "task-1",
      [secondId, firstId],
    );
  });
});
