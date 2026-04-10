import { describe, expect, it } from "vite-plus/test";

import {
  buildConceptProjectSetupSummary,
  getSetupRoadmapCurrentVersion,
} from "../lib/concept-project/setup";

describe("buildConceptProjectSetupSummary", () => {
  it("captures repo shape, language, framework, libraries, and skills", () => {
    expect(
      buildConceptProjectSetupSummary({
        framework: "Next.js",
        libraries: ["Zero", "WorkOS"],
        monorepoRecommendation: "Single repo",
        primaryLanguage: "TypeScript",
        skills: ["frontend-design", "workos"],
        summary: "Use a web-first app shell with auth and sync ready from day one.",
      }),
    ).toBe(
      "Repo shape: Single repo. Primary language: TypeScript. Framework: Next.js. Libraries: Zero, WorkOS. Skills/tooling: frontend-design, workos. Use a web-first app shell with auth and sync ready from day one.",
    );
  });
});

describe("getSetupRoadmapCurrentVersion", () => {
  it("pins concept setup current to v0.0 even when later roadmap items exist", () => {
    expect(getSetupRoadmapCurrentVersion({ currentMajor: 1, currentMinor: 3 }, 6)).toEqual({
      currentMajor: 0,
      currentMinor: 0,
    });
  });

  it("stays pinned to v0.0 when only setup items exist", () => {
    expect(getSetupRoadmapCurrentVersion({ currentMajor: 0, currentMinor: 0 }, 4)).toEqual({
      currentMajor: 0,
      currentMinor: 0,
    });
  });

  it("leaves an empty roadmap at v0.0 when no setup items are generated", () => {
    expect(getSetupRoadmapCurrentVersion(null, 0)).toEqual({
      currentMajor: 0,
      currentMinor: 0,
    });
  });
});
