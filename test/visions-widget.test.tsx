import { readFileSync } from "node:fs";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vite-plus/test";

vi.mock("../components/ui/button", () => ({
  Button: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  buttonVariants: () => "button",
}));

vi.mock("../components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

vi.mock("../components/vision/create-vision-dialog", () => ({
  CreateVisionDialog: () => <button>New vision</button>,
}));

import VisionsWidgetPreview from "../components/widgets/visions/visions-widget-preview";
import VisionsWidget from "../components/widgets/visions/visions-widget";
import { getVisionWidgetLayout } from "../components/widgets/visions/visions-widget-shared";
import type { WidgetProjectContext } from "../lib/widgets/types";

const baseProject: WidgetProjectContext = {
  projectId: "project-1",
  roadmap: null,
  roadmapItems: [],
  visions: [
    {
      collaborators: [],
      createdAt: "2026-04-15T09:00:00.000Z",
      id: "vision-1",
      ownerName: "Abel",
      ownerUserId: "user-1",
      title: "Checkout rethink",
      updatedAt: "2026-04-15T12:30:00.000Z",
    },
    {
      collaborators: [
        {
          name: "Riley",
          userId: "user-2",
        },
      ],
      createdAt: "2026-04-15T08:00:00.000Z",
      id: "vision-2",
      ownerName: "Abel",
      ownerUserId: "user-1",
      title: "Referral onboarding",
      updatedAt: "2026-04-15T11:30:00.000Z",
    },
    {
      collaborators: [
        {
          name: "Mina",
          userId: "user-3",
        },
      ],
      createdAt: "2026-04-15T07:00:00.000Z",
      id: "vision-3",
      ownerName: "Abel",
      ownerUserId: "user-1",
      title: "Analytics relaunch",
      updatedAt: "2026-04-15T10:30:00.000Z",
    },
    {
      collaborators: [
        {
          name: "Jules",
          userId: "user-4",
        },
      ],
      createdAt: "2026-04-15T06:00:00.000Z",
      id: "vision-4",
      ownerName: "Abel",
      ownerUserId: "user-1",
      title: "Partner portal",
      updatedAt: "2026-04-15T09:30:00.000Z",
    },
    {
      collaborators: [
        {
          name: "Nina",
          userId: "user-5",
        },
      ],
      createdAt: "2026-04-15T05:00:00.000Z",
      id: "vision-5",
      ownerName: "Abel",
      ownerUserId: "user-1",
      title: "Mobile capture flow",
      updatedAt: "2026-04-15T08:30:00.000Z",
    },
  ],
};

describe("VisionsWidget layout helper", () => {
  it("uses the compact 1x2 layout", () => {
    expect(getVisionWidgetLayout(1, 2)).toEqual({
      maxRows: 2,
      showCollaborators: false,
      showOwner: false,
      showUpdatedAt: false,
    });
  });

  it("uses the 2x2 layout with owner and last updated", () => {
    expect(getVisionWidgetLayout(2, 2)).toEqual({
      maxRows: 3,
      showCollaborators: false,
      showOwner: true,
      showUpdatedAt: true,
    });
  });

  it("uses the full 3x2 layout", () => {
    expect(getVisionWidgetLayout(3, 2)).toEqual({
      maxRows: 4,
      showCollaborators: true,
      showOwner: true,
      showUpdatedAt: true,
    });
  });

  it("adds one extra row for tall variants", () => {
    expect(getVisionWidgetLayout(1, 3).maxRows).toBe(3);
    expect(getVisionWidgetLayout(2, 3).maxRows).toBe(4);
    expect(getVisionWidgetLayout(3, 3).maxRows).toBe(5);
  });
});

describe("VisionsWidget rendering", () => {
  it("renders an empty state when there are no visions", () => {
    const markup = renderToStaticMarkup(
      <VisionsWidget
        height={2}
        project={{
          ...baseProject,
          visions: [],
        }}
        width={2}
      />,
    );

    expect(markup).toContain("No visions yet");
    expect(markup).not.toContain("View all visions");
  });

  it("renders the collaborators fallback and detail links", () => {
    const markup = renderToStaticMarkup(
      <VisionsWidget height={2} project={baseProject} width={3} />,
    );

    expect(markup).toContain("Private to owner");
    expect(markup).toContain("/project/project-1/ideas/vision/vision-1");
    expect(markup).toContain("Open");
  });

  it("shows the overflow footer only when rows are truncated", () => {
    const truncatedMarkup = renderToStaticMarkup(
      <VisionsWidget height={2} project={baseProject} width={2} />,
    );
    const fullMarkup = renderToStaticMarkup(
      <VisionsWidget height={3} project={baseProject} width={3} />,
    );

    expect(truncatedMarkup).toContain("View all visions");
    expect(truncatedMarkup).toContain("/project/project-1/ideas");
    expect(fullMarkup).not.toContain("View all visions");
  });
});

describe("VisionsWidget preview config", () => {
  it("registers the preview component", () => {
    const configSource = readFileSync(
      "/Users/abeldebruijn/Documents/GitHub/FurrowDev/components/widgets/visions/config.ts",
      "utf8",
    );

    expect(configSource).toContain(".setPreview(VisionsWidgetPreview)");
  });

  it("uses the same column visibility rules in preview", () => {
    const compactMarkup = renderToStaticMarkup(
      <VisionsWidgetPreview height={2} project={baseProject} width={1} />,
    );
    const fullMarkup = renderToStaticMarkup(
      <VisionsWidgetPreview height={2} project={baseProject} width={3} />,
    );

    expect(compactMarkup).not.toContain("Owner");
    expect(compactMarkup).not.toContain("Collaborators");
    expect(compactMarkup).not.toContain("Last updated");
    expect(fullMarkup).toContain("Owner");
    expect(fullMarkup).toContain("Collaborators");
    expect(fullMarkup).toContain("Last updated");
  });
});
