import { describe, expect, it } from "vite-plus/test";

import { getProjectAccessCapabilities } from "../lib/project/access";

describe("project access capabilities", () => {
  it("keeps maintainers on operational capabilities only", () => {
    expect(
      getProjectAccessCapabilities({
        isAdmin: false,
        isMaintainer: true,
        isOrganisationProject: false,
        isOwner: false,
      }),
    ).toEqual({
      canConvertVisionToIdea: true,
      canEditProjectProfile: false,
      canEditWidgetLayout: true,
      canManageMaintainers: false,
      canMoveOwnership: false,
      canViewModeration: false,
      canViewProjectSettings: false,
    });
  });

  it("lets admins manage maintainers without moving ownership", () => {
    expect(
      getProjectAccessCapabilities({
        isAdmin: true,
        isMaintainer: false,
        isOrganisationProject: true,
        isOwner: false,
      }),
    ).toEqual({
      canConvertVisionToIdea: true,
      canEditProjectProfile: true,
      canEditWidgetLayout: true,
      canManageMaintainers: true,
      canMoveOwnership: false,
      canViewModeration: true,
      canViewProjectSettings: true,
    });
  });

  it("keeps ownership transfer with the owner", () => {
    expect(
      getProjectAccessCapabilities({
        isAdmin: false,
        isMaintainer: false,
        isOrganisationProject: false,
        isOwner: true,
      }),
    ).toEqual({
      canConvertVisionToIdea: true,
      canEditProjectProfile: true,
      canEditWidgetLayout: true,
      canManageMaintainers: true,
      canMoveOwnership: true,
      canViewModeration: false,
      canViewProjectSettings: true,
    });
  });
});
