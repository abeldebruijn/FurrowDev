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
  currentVersion: { currentMajor: number; currentMinor: number } | null,
  itemCount: number,
) {
  if ((currentVersion?.currentMajor ?? 0) > 0) {
    return {
      currentMajor: currentVersion?.currentMajor ?? 0,
      currentMinor: currentVersion?.currentMinor ?? 0,
    };
  }

  return {
    currentMajor: itemCount > 0 ? 0 : (currentVersion?.currentMajor ?? 0),
    currentMinor: itemCount > 0 ? itemCount - 1 : (currentVersion?.currentMinor ?? 0),
  };
}
