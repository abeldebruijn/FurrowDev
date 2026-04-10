import { ApplicationError } from "@rocicorp/zero";

type RoadmapVersion = {
  majorVersion: number;
  minorVersion: number;
};

export function isValidRoadmapParentVersion(parent: RoadmapVersion, child: RoadmapVersion) {
  if (child.majorVersion < parent.majorVersion) {
    return false;
  }

  if (child.majorVersion === parent.majorVersion && child.minorVersion <= parent.minorVersion) {
    return false;
  }

  return true;
}

export function assertValidRoadmapParentVersion(parent: RoadmapVersion, child: RoadmapVersion) {
  if (!isValidRoadmapParentVersion(parent, child)) {
    throw new ApplicationError("Roadmap item version must come after its parent", {
      details: {
        parent,
        child,
      },
    });
  }
}
