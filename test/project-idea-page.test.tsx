import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const { getProjectIdeaById, getProjectPageData } = vi.hoisted(() => ({
  getProjectIdeaById: vi.fn(),
  getProjectPageData: vi.fn(),
}));

vi.mock("../app/project/[project-id]/project-page-data", () => ({
  getProjectPageData,
}));

vi.mock("@/lib/idea/server", () => ({
  getProjectIdeaById,
}));

vi.mock("@/components/idea/idea-workspace", () => ({
  IdeaWorkspace: ({ idea, projectId }: { idea: { title: string }; projectId: string }) => (
    <div>{`${idea.title}::${projectId}`}</div>
  ),
}));

import IdeaPage from "../app/project/[project-id]/ideas/idea/[idea-id]/page";

describe("IdeaPage", () => {
  beforeEach(() => {
    getProjectIdeaById.mockReset();
    getProjectPageData.mockReset();

    getProjectPageData.mockResolvedValue({
      project: {
        id: "project-1",
      },
      projectRoadmapItems: [],
      viewer: {
        id: "viewer-1",
      },
    });
  });

  it("renders the idea workspace", async () => {
    getProjectIdeaById.mockResolvedValue({
      context: "Context",
      createdAt: new Date("2026-04-15T10:00:00.000Z"),
      createdByName: "Riley",
      id: "idea-1",
      roadmapItemId: null,
      sourceVisionId: "vision-1",
      sourceVisionTitle: "Checkout rethink",
      specSheet: "Spec",
      title: "Shared checkout idea",
      updatedAt: new Date("2026-04-15T10:00:00.000Z"),
      userStories: [],
    });

    const markup = renderToStaticMarkup(
      await IdeaPage({
        params: Promise.resolve({
          "idea-id": "idea-1",
          "project-id": "project-1",
        }),
      }),
    );

    expect(getProjectIdeaById).toHaveBeenCalledWith("viewer-1", "project-1", "idea-1");
    expect(markup).toContain("Shared checkout idea::project-1");
  });
});
