import { describe, expect, it } from "vite-plus/test";

import {
  getConceptProjectRoadmapDeletePlan,
  getConceptProjectRoadmapInsertPlan,
  getNextRoadmapRailCollapsed,
  groupConceptProjectRoadmapVersions,
} from "../lib/concept-project/roadmap";

describe("groupConceptProjectRoadmapVersions", () => {
  it("returns an empty list when there are no roadmap items", () => {
    expect(groupConceptProjectRoadmapVersions([], null)).toEqual([]);
  });

  it("groups roadmap items by version and keeps the current version highlight on the grouped node", () => {
    expect(
      groupConceptProjectRoadmapVersions(
        [
          {
            description: null,
            id: "setup-a",
            majorVersion: 0,
            minorVersion: 0,
            name: "Bootstrap repo",
          },
          {
            description: null,
            id: "setup-b",
            majorVersion: 0,
            minorVersion: 0,
            name: "Configure auth",
          },
          {
            description: null,
            id: "what-a",
            majorVersion: 1,
            minorVersion: 0,
            name: "What flow",
          },
        ],
        {
          currentMajor: 0,
          currentMinor: 0,
        },
      ),
    ).toEqual([
      {
        canInsertAfter: false,
        itemCount: 2,
        insertAfterVersion: "v0.0",
        insertMajorVersion: 0,
        insertMinorVersion: 1,
        isCurrent: true,
        items: [
          {
            description: null,
            id: "setup-a",
            majorVersion: 0,
            minorVersion: 0,
            name: "Bootstrap repo",
          },
          {
            description: null,
            id: "setup-b",
            majorVersion: 0,
            minorVersion: 0,
            name: "Configure auth",
          },
        ],
        label: "Bootstrap repo",
        majorVersion: 0,
        minorVersion: 0,
        nextVersionInTrack: null,
        version: "v0.0",
      },
      {
        canInsertAfter: true,
        itemCount: 1,
        insertAfterVersion: "v1.0",
        insertMajorVersion: 1,
        insertMinorVersion: 1,
        isCurrent: false,
        items: [
          {
            description: null,
            id: "what-a",
            majorVersion: 1,
            minorVersion: 0,
            name: "What flow",
          },
        ],
        label: "What flow",
        majorVersion: 1,
        minorVersion: 0,
        nextVersionInTrack: null,
        version: "v1.0",
      },
    ]);
  });

  it("includes the next version in the same track for valid insertion boundaries", () => {
    expect(
      groupConceptProjectRoadmapVersions(
        [
          {
            description: null,
            id: "v0-0",
            majorVersion: 0,
            minorVersion: 0,
            name: "Setup",
          },
          {
            description: null,
            id: "v0-1",
            majorVersion: 0,
            minorVersion: 1,
            name: "Repo shape",
          },
        ],
        null,
      ).map((version) => ({
        nextVersionInTrack: version.nextVersionInTrack,
        version: version.version,
      })),
    ).toEqual([
      {
        nextVersionInTrack: "v0.1",
        version: "v0.0",
      },
      {
        nextVersionInTrack: null,
        version: "v0.1",
      },
    ]);
  });

  it("allows insertion only within the same major track or after the last overall version", () => {
    expect(
      groupConceptProjectRoadmapVersions(
        [
          {
            description: null,
            id: "v0-0",
            majorVersion: 0,
            minorVersion: 0,
            name: "Setup",
          },
          {
            description: null,
            id: "v0-1",
            majorVersion: 0,
            minorVersion: 1,
            name: "Repo shape",
          },
          {
            description: null,
            id: "v1-0",
            majorVersion: 1,
            minorVersion: 0,
            name: "Product launch",
          },
        ],
        null,
      ).map((version) => ({
        canInsertAfter: version.canInsertAfter,
        version: version.version,
      })),
    ).toEqual([
      {
        canInsertAfter: true,
        version: "v0.0",
      },
      {
        canInsertAfter: false,
        version: "v0.1",
      },
      {
        canInsertAfter: true,
        version: "v1.0",
      },
    ]);
  });
});

describe("getConceptProjectRoadmapInsertPlan", () => {
  it("shifts later versions in the same major track when inserting between nodes", () => {
    expect(
      getConceptProjectRoadmapInsertPlan(
        [
          {
            description: null,
            id: "v0-1",
            majorVersion: 0,
            minorVersion: 1,
            name: "One",
          },
          {
            description: null,
            id: "v0-2a",
            majorVersion: 0,
            minorVersion: 2,
            name: "Two A",
          },
          {
            description: null,
            id: "v0-2b",
            majorVersion: 0,
            minorVersion: 2,
            name: "Two B",
          },
          {
            description: null,
            id: "v0-3",
            majorVersion: 0,
            minorVersion: 3,
            name: "Three",
          },
        ],
        {
          currentMajor: 0,
          currentMinor: 2,
        },
        {
          majorVersion: 0,
          minorVersion: 2,
        },
      ),
    ).toEqual({
      nextCurrentVersion: {
        currentMajor: 0,
        currentMinor: 3,
      },
      shiftedItems: [
        {
          id: "v0-2a",
          majorVersion: 0,
          minorVersion: 2,
          nextMinorVersion: 3,
        },
        {
          id: "v0-2b",
          majorVersion: 0,
          minorVersion: 2,
          nextMinorVersion: 3,
        },
        {
          id: "v0-3",
          majorVersion: 0,
          minorVersion: 3,
          nextMinorVersion: 4,
        },
      ],
    });
  });

  it("creates the next minor version when inserting after the last node in a major track", () => {
    expect(
      getConceptProjectRoadmapInsertPlan(
        [
          {
            description: null,
            id: "v1-0",
            majorVersion: 1,
            minorVersion: 0,
            name: "One",
          },
          {
            description: null,
            id: "v1-1",
            majorVersion: 1,
            minorVersion: 1,
            name: "Two",
          },
        ],
        {
          currentMajor: 1,
          currentMinor: 0,
        },
        {
          majorVersion: 1,
          minorVersion: 2,
        },
      ),
    ).toEqual({
      nextCurrentVersion: {
        currentMajor: 1,
        currentMinor: 0,
      },
      shiftedItems: [],
    });
  });

  it("rejects inserting before v0.0", () => {
    expect(() =>
      getConceptProjectRoadmapInsertPlan(
        [
          {
            description: null,
            id: "v0-0",
            majorVersion: 0,
            minorVersion: 0,
            name: "Setup",
          },
        ],
        null,
        {
          majorVersion: 0,
          minorVersion: 0,
        },
      ),
    ).toThrow("Cannot insert before v0.0.");
  });

  it("rejects insertion across major-version boundaries", () => {
    expect(() =>
      getConceptProjectRoadmapInsertPlan(
        [
          {
            description: null,
            id: "v0-0",
            majorVersion: 0,
            minorVersion: 0,
            name: "Setup",
          },
          {
            description: null,
            id: "v0-1",
            majorVersion: 0,
            minorVersion: 1,
            name: "Repo",
          },
          {
            description: null,
            id: "v1-0",
            majorVersion: 1,
            minorVersion: 0,
            name: "Launch",
          },
        ],
        null,
        {
          majorVersion: 0,
          minorVersion: 2,
        },
      ),
    ).toThrow("Cannot insert across roadmap major-version boundaries.");
  });
});

describe("getConceptProjectRoadmapDeletePlan", () => {
  it("keeps the current version when deleting one node from a grouped version", () => {
    expect(
      getConceptProjectRoadmapDeletePlan(
        [
          {
            description: null,
            id: "v0-2a",
            majorVersion: 0,
            minorVersion: 2,
            name: "Two A",
          },
          {
            description: null,
            id: "v0-2b",
            majorVersion: 0,
            minorVersion: 2,
            name: "Two B",
          },
          {
            description: null,
            id: "v0-3",
            majorVersion: 0,
            minorVersion: 3,
            name: "Three",
          },
        ],
        {
          currentMajor: 0,
          currentMinor: 2,
        },
        "v0-2a",
      ),
    ).toEqual({
      nextCurrentVersion: {
        currentMajor: 0,
        currentMinor: 2,
      },
      shiftedItems: [],
      shouldCollapseVersionGroup: false,
    });
  });

  it("closes the gap and shifts current back when deleting the only node in a version", () => {
    expect(
      getConceptProjectRoadmapDeletePlan(
        [
          {
            description: null,
            id: "v0-1",
            majorVersion: 0,
            minorVersion: 1,
            name: "One",
          },
          {
            description: null,
            id: "v0-2",
            majorVersion: 0,
            minorVersion: 2,
            name: "Two",
          },
          {
            description: null,
            id: "v0-3",
            majorVersion: 0,
            minorVersion: 3,
            name: "Three",
          },
        ],
        {
          currentMajor: 0,
          currentMinor: 3,
        },
        "v0-2",
      ),
    ).toEqual({
      nextCurrentVersion: {
        currentMajor: 0,
        currentMinor: 2,
      },
      shiftedItems: [
        {
          id: "v0-3",
          majorVersion: 0,
          minorVersion: 3,
          nextMinorVersion: 2,
        },
      ],
      shouldCollapseVersionGroup: true,
    });
  });

  it("moves current to the nearest previous version when deleting the only current node", () => {
    expect(
      getConceptProjectRoadmapDeletePlan(
        [
          {
            description: null,
            id: "v0-1",
            majorVersion: 0,
            minorVersion: 1,
            name: "One",
          },
          {
            description: null,
            id: "v0-2",
            majorVersion: 0,
            minorVersion: 2,
            name: "Two",
          },
        ],
        {
          currentMajor: 0,
          currentMinor: 2,
        },
        "v0-2",
      ),
    ).toEqual({
      nextCurrentVersion: {
        currentMajor: 0,
        currentMinor: 1,
      },
      shiftedItems: [],
      shouldCollapseVersionGroup: true,
    });
  });
});

describe("getNextRoadmapRailCollapsed", () => {
  it("stays expanded near the top of the page", () => {
    expect(
      getNextRoadmapRailCollapsed({
        isCollapsed: true,
        previousScrollY: 96,
        scrollY: 60,
      }),
    ).toBe(false);
  });

  it("stays expanded after the threshold while scrolling down", () => {
    expect(
      getNextRoadmapRailCollapsed({
        isCollapsed: true,
        previousScrollY: 140,
        scrollY: 196,
      }),
    ).toBe(false);
  });

  it("collapses when the user scrolls back up", () => {
    expect(
      getNextRoadmapRailCollapsed({
        isCollapsed: false,
        previousScrollY: 240,
        scrollY: 208,
      }),
    ).toBe(true);
  });
});
