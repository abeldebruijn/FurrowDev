export type ProjectAccessCapabilities = {
  canConvertVisionToIdea: boolean;
  canEditProjectProfile: boolean;
  canEditWidgetLayout: boolean;
  canManageMaintainers: boolean;
  canMoveOwnership: boolean;
  canViewModeration: boolean;
  canViewProjectSettings: boolean;
};

export function getProjectAccessCapabilities({
  isAdmin,
  isMaintainer,
  isOrganisationProject,
  isOwner,
}: {
  isAdmin: boolean;
  isMaintainer: boolean;
  isOrganisationProject: boolean;
  isOwner: boolean;
}): ProjectAccessCapabilities {
  const canEditProjectProfile = isOwner || isAdmin;
  const canManageMaintainers = isOwner || isAdmin;
  const canMoveOwnership = isOwner;
  const canEditWidgetLayout = isOwner || isAdmin || isMaintainer;
  const canConvertVisionToIdea = canEditWidgetLayout;

  return {
    canConvertVisionToIdea,
    canEditProjectProfile,
    canEditWidgetLayout,
    canManageMaintainers,
    canMoveOwnership,
    canViewModeration: isOrganisationProject && (isOwner || isAdmin),
    canViewProjectSettings: canEditProjectProfile || canManageMaintainers || canMoveOwnership,
  };
}
