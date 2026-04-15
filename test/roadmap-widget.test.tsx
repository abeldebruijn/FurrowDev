import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import RoadmapWidget, {
  getInitialRoadmapWidgetIndex,
  getNextRoadmapWidgetIndex,
} from "../components/widgets/roadmap/roadmap-widget";

describe("RoadmapWidget helpers", () => {
  it("starts on the current grouped version when present", () => {
    expect(
      getInitialRoadmapWidgetIndex([
        {
          canInsertAfter: true,
          insertAfterVersion: "v1.0",
          insertMajorVersion: 1,
          insertMinorVersion: 1,
          isCurrent: false,
          itemCount: 1,
          items: [],
          label: "First",
          majorVersion: 1,
          minorVersion: 0,
          nextVersionInTrack: "v1.1",
          version: "v1.0",
        },
        {
          canInsertAfter: true,
          insertAfterVersion: "v1.1",
          insertMajorVersion: 1,
          insertMinorVersion: 2,
          isCurrent: true,
          itemCount: 1,
          items: [],
          label: "Second",
          majorVersion: 1,
          minorVersion: 1,
          nextVersionInTrack: null,
          version: "v1.1",
        },
      ]),
    ).toBe(1);
  });

  it("clamps next and previous navigation inside bounds", () => {
    const versions = [
      {
        canInsertAfter: true,
        insertAfterVersion: "v1.0",
        insertMajorVersion: 1,
        insertMinorVersion: 1,
        isCurrent: false,
        itemCount: 1,
        items: [],
        label: "First",
        majorVersion: 1,
        minorVersion: 0,
        nextVersionInTrack: "v1.1",
        version: "v1.0",
      },
      {
        canInsertAfter: true,
        insertAfterVersion: "v1.1",
        insertMajorVersion: 1,
        insertMinorVersion: 2,
        isCurrent: true,
        itemCount: 1,
        items: [],
        label: "Second",
        majorVersion: 1,
        minorVersion: 1,
        nextVersionInTrack: null,
        version: "v1.1",
      },
    ];

    expect(getNextRoadmapWidgetIndex(0, "previous", versions)).toBe(0);
    expect(getNextRoadmapWidgetIndex(0, "next", versions)).toBe(1);
    expect(getNextRoadmapWidgetIndex(1, "next", versions)).toBe(1);
  });
});

describe("RoadmapWidget rendering", () => {
  it("renders the current version and roadmap link", () => {
    const markup = renderToStaticMarkup(
      <RoadmapWidget
        height={2}
        project={{
          projectId: "project-1",
          roadmap: {
            currentMajor: 1,
            currentMinor: 2,
            id: "roadmap-1",
          },
          roadmapItems: [
            {
              description: "Ship the public beta with onboarding.",
              id: "item-1",
              majorVersion: 1,
              minorVersion: 2,
              name: "Public beta",
            },
          ],
          visions: [],
        }}
        width={2}
      />,
    );

    expect(markup).toContain("Current v1.2");
    expect(markup).toContain("Public beta");
    expect(markup).toContain("/project/project-1/roadmap");
  });

  it("renders a compact empty state when no roadmap items exist", () => {
    const markup = renderToStaticMarkup(
      <RoadmapWidget
        height={2}
        project={{
          projectId: "project-1",
          roadmap: null,
          roadmapItems: [],
          visions: [],
        }}
        width={2}
      />,
    );

    expect(markup).toContain("No roadmap yet");
    expect(markup).toContain("/project/project-1/roadmap");
  });
});
