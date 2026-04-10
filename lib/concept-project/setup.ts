import { getPinnedConceptRoadmapCurrentVersion } from "./roadmap";

export function buildConceptProjectSetupSummary(input: {
  framework: string;
  libraries: string[];
  monorepoRecommendation: string;
  primaryLanguage: string;
  skills: string[];
  summary: string;
}) {
  return [
    `Repo shape: ${input.monorepoRecommendation.trim()}.`,
    `Primary language: ${input.primaryLanguage.trim()}.`,
    `Framework: ${input.framework.trim()}.`,
    `Libraries: ${input.libraries.map((library) => library.trim()).join(", ")}.`,
    `Skills/tooling: ${input.skills.map((skill) => skill.trim()).join(", ")}.`,
    input.summary.trim(),
  ].join(" ");
}

export function getSetupRoadmapCurrentVersion(
  _currentVersion: { currentMajor: number; currentMinor: number } | null,
  _itemCount: number,
) {
  return getPinnedConceptRoadmapCurrentVersion();
}
