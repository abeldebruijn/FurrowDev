import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const { getProjectPageData } = vi.hoisted(() => ({
  getProjectPageData: vi.fn(),
}));

vi.mock("../app/project/[project-id]/project-page-data", () => ({
  getProjectPageData,
}));

import ProjectRoadmapPage from "../app/project/[project-id]/roadmap/page";

describe("ProjectRoadmapPage", () => {
  beforeEach(() => {
    getProjectPageData.mockReset();
  });

  it("renders grouped roadmap content for a project", async () => {
    getProjectPageData.mockResolvedValue({
      project: {
        id: "project-1",
      },
      projectRoadmap: {
        currentMajor: 1,
        currentMinor: 1,
        id: "roadmap-1",
      },
      projectRoadmapItems: [
        {
          description: "Ship the first milestone",
          id: "item-1",
          majorVersion: 1,
          minorVersion: 1,
          name: "Milestone one",
        },
      ],
    });

    const markup = renderToStaticMarkup(
      await ProjectRoadmapPage({
        params: Promise.resolve({
          "project-id": "project-1",
        }),
      }),
    );

    expect(markup).toContain("Project roadmap");
    expect(markup).toContain("Current v1.1");
    expect(markup).toContain("Milestone one");
  });

  it("renders an empty message when the project has no roadmap items", async () => {
    getProjectPageData.mockResolvedValue({
      project: {
        id: "project-1",
      },
      projectRoadmap: null,
      projectRoadmapItems: [],
    });

    const markup = renderToStaticMarkup(
      await ProjectRoadmapPage({
        params: Promise.resolve({
          "project-id": "project-1",
        }),
      }),
    );

    expect(markup).toContain("No roadmap yet for this project.");
  });
});
