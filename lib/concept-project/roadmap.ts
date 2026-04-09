export type ConceptProjectRoadmapVisualItem = {
  description: string | null;
  id: string;
  majorVersion: number;
  minorVersion: number;
  name: string;
};

export type ConceptProjectRoadmapCurrentVersion = {
  currentMajor: number;
  currentMinor: number;
} | null;

export type GroupedConceptProjectRoadmapVersion = {
  canInsertAfter: boolean;
  itemCount: number;
  insertMajorVersion: number;
  insertMinorVersion: number;
  insertAfterVersion: string;
  isCurrent: boolean;
  items: ConceptProjectRoadmapVisualItem[];
  label: string;
  majorVersion: number;
  minorVersion: number;
  nextVersionInTrack: string | null;
  version: string;
};

export type ConceptProjectRoadmapInsertPlan = {
  nextCurrentVersion: ConceptProjectRoadmapCurrentVersion;
  shiftedItems: Array<{
    id: string;
    majorVersion: number;
    minorVersion: number;
    nextMinorVersion: number;
  }>;
};

type RoadmapRailCollapseArgs = {
  collapseThreshold?: number;
  deltaThreshold?: number;
  isCollapsed: boolean;
  previousScrollY: number;
  scrollY: number;
};

export function getRoadmapVersionLabel(majorVersion: number, minorVersion: number) {
  return `v${majorVersion}.${minorVersion}`;
}

export function groupConceptProjectRoadmapVersions(
  items: ConceptProjectRoadmapVisualItem[],
  currentVersion: ConceptProjectRoadmapCurrentVersion,
): GroupedConceptProjectRoadmapVersion[] {
  const groupedVersions = new Map<string, ConceptProjectRoadmapVisualItem[]>();

  for (const item of items) {
    const key = `${item.majorVersion}.${item.minorVersion}`;
    const existing = groupedVersions.get(key);

    if (existing) {
      existing.push(item);
      continue;
    }

    groupedVersions.set(key, [item]);
  }

  const grouped = [...groupedVersions.entries()].map(([key, versionItems]) => {
    const [majorVersion, minorVersion] = key.split(".").map(Number);
    const primaryItem = versionItems[0];

    return {
      itemCount: versionItems.length,
      items: versionItems,
      label: primaryItem?.name.trim() || getRoadmapVersionLabel(majorVersion, minorVersion),
      majorVersion,
      minorVersion,
      version: getRoadmapVersionLabel(majorVersion, minorVersion),
    };
  });

  return grouped.map((version, index) => {
    const nextVersion = grouped[index + 1];
    const canInsertAfter = !nextVersion || nextVersion.majorVersion === version.majorVersion;
    const insertMinorVersion = version.minorVersion + 1;

    return {
      ...version,
      canInsertAfter,
      insertAfterVersion: version.version,
      insertMajorVersion: version.majorVersion,
      insertMinorVersion,
      isCurrent:
        currentVersion?.currentMajor === version.majorVersion &&
        currentVersion?.currentMinor === version.minorVersion,
      nextVersionInTrack:
        nextVersion && nextVersion.majorVersion === version.majorVersion
          ? nextVersion.version
          : null,
    };
  });
}

export function getConceptProjectRoadmapInsertPlan(
  items: ConceptProjectRoadmapVisualItem[],
  currentVersion: ConceptProjectRoadmapCurrentVersion,
  {
    majorVersion,
    minorVersion,
  }: {
    majorVersion: number;
    minorVersion: number;
  },
): ConceptProjectRoadmapInsertPlan {
  if (majorVersion === 0 && minorVersion === 0) {
    throw new Error("Cannot insert before v0.0.");
  }

  const sameMajorItems = items.filter((item) => item.majorVersion === majorVersion);

  if (sameMajorItems.length === 0) {
    throw new Error("Cannot insert into an empty roadmap track.");
  }

  const maxMinorVersion = Math.max(...sameMajorItems.map((item) => item.minorVersion));

  if (minorVersion < 1 || minorVersion > maxMinorVersion + 1) {
    throw new Error("Invalid roadmap insertion point.");
  }

  const isAfterEndOfMajorTrack = minorVersion === maxMinorVersion + 1;
  const hasLaterMajorTrack = items.some((item) => item.majorVersion > majorVersion);

  if (isAfterEndOfMajorTrack && hasLaterMajorTrack) {
    throw new Error("Cannot insert across roadmap major-version boundaries.");
  }

  const shiftedItems = sameMajorItems
    .filter((item) => item.minorVersion >= minorVersion)
    .map((item) => ({
      id: item.id,
      majorVersion: item.majorVersion,
      minorVersion: item.minorVersion,
      nextMinorVersion: item.minorVersion + 1,
    }));

  const nextCurrentVersion =
    currentVersion &&
    currentVersion.currentMajor === majorVersion &&
    currentVersion.currentMinor >= minorVersion
      ? {
          currentMajor: currentVersion.currentMajor,
          currentMinor: currentVersion.currentMinor + 1,
        }
      : currentVersion;

  return {
    nextCurrentVersion,
    shiftedItems,
  };
}

export function getNextRoadmapRailCollapsed({
  collapseThreshold = 160,
  deltaThreshold = 8,
  isCollapsed,
  previousScrollY,
  scrollY,
}: RoadmapRailCollapseArgs) {
  if (scrollY <= collapseThreshold / 2) {
    return false;
  }

  const delta = scrollY - previousScrollY;

  if (delta >= deltaThreshold && scrollY > collapseThreshold) {
    return false;
  }

  if (delta <= -deltaThreshold) {
    return true;
  }

  return isCollapsed;
}
