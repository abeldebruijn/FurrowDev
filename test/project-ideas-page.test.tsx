import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const { getProjectPageData, listVisibleProjectVisions } = vi.hoisted(() => ({
  getProjectPageData: vi.fn(),
  listVisibleProjectVisions: vi.fn(),
}));

vi.mock("../app/project/[project-id]/project-page-data", () => ({
  getProjectPageData,
}));

vi.mock("@/lib/vision/server", () => ({
  listVisibleProjectVisions,
}));

vi.mock("@/components/vision/create-vision-dialog", () => ({
  CreateVisionDialog: () => <div>New vision</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  buttonVariants: () => "button",
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

import ProjectIdeasPage from "../app/project/[project-id]/ideas/page";

describe("ProjectIdeasPage", () => {
  beforeEach(() => {
    getProjectPageData.mockReset();
    listVisibleProjectVisions.mockReset();

    getProjectPageData.mockResolvedValue({
      project: {
        id: "project-1",
      },
      projectRoadmapItems: [
        {
          description: "Ship a beta",
          id: "roadmap-1",
          majorVersion: 1,
          minorVersion: 0,
          name: "Beta",
        },
      ],
      viewer: {
        id: "viewer-1",
      },
    });
  });

  it("renders an empty state when no visions are visible", async () => {
    listVisibleProjectVisions.mockResolvedValue([]);

    const markup = renderToStaticMarkup(
      await ProjectIdeasPage({
        params: Promise.resolve({
          "project-id": "project-1",
        }),
      }),
    );

    expect(markup).toContain("Visions");
    expect(markup).toContain("No visions yet");
    expect(markup).toContain("New vision");
  });

  it("renders the visible visions table", async () => {
    listVisibleProjectVisions.mockResolvedValue([
      {
        collaborators: [
          {
            name: "Riley",
            userId: "user-2",
          },
        ],
        createdAt: new Date("2026-04-15T10:00:00.000Z"),
        id: "vision-1",
        ownerName: "Abel",
        ownerUserId: "viewer-1",
        title: "Checkout rethink",
        updatedAt: new Date("2026-04-15T12:30:00.000Z"),
      },
    ]);

    const markup = renderToStaticMarkup(
      await ProjectIdeasPage({
        params: Promise.resolve({
          "project-id": "project-1",
        }),
      }),
    );

    expect(markup).toContain("Checkout rethink");
    expect(markup).toContain("Riley");
    expect(markup).toContain("/project/project-1/ideas/vision/vision-1");
  });
});
