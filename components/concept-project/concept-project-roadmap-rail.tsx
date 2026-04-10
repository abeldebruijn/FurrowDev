"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getNextRoadmapRailCollapsed,
  getRoadmapVersionLabel,
  groupConceptProjectRoadmapVersions,
  type ConceptProjectRoadmapCurrentVersion,
  type ConceptProjectRoadmapVisualItem,
  type GroupedConceptProjectRoadmapVersion,
} from "@/lib/concept-project/roadmap";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, PlusIcon, Trash2Icon } from "lucide-react";

const ROADMAP_RAIL_COLLAPSE_THRESHOLD_PX = 160;

type InsertRoadmapVersionArgs = {
  description?: string;
  majorVersion: number;
  minorVersion: number;
  name: string;
};

type EditRoadmapNodeDraft = {
  description: string;
  id: string;
  name: string;
};

type DeleteRoadmapNodeTarget = {
  id: string;
  name: string;
  versionLabel: string;
} | null;

function getInsertionDescription(target: GroupedConceptProjectRoadmapVersion) {
  if (target.nextVersionInTrack) {
    return `Insert a Roadmap Node after ${target.insertAfterVersion} before ${target.nextVersionInTrack}.`;
  }

  return `Insert a Roadmap Node after ${target.insertAfterVersion} at the end of the ${getRoadmapVersionLabel(target.insertMajorVersion, 0)} track.`;
}

export function ConceptProjectRoadmapRail({
  canEditVersions,
  canInsertVersions,
  currentVersion,
  disableCollapse = false,
  scrollToCurrentVersion = false,
  onDeleteRoadmapNode,
  onInsertVersion,
  onUpdateRoadmapVersionNodes,
  roadmap,
  className,
}: {
  canEditVersions: boolean;
  canInsertVersions: boolean;
  currentVersion: ConceptProjectRoadmapCurrentVersion;
  disableCollapse?: boolean;
  scrollToCurrentVersion?: boolean;
  onDeleteRoadmapNode?: (nodeId: string) => Promise<void>;
  onInsertVersion?: (args: InsertRoadmapVersionArgs) => Promise<void>;
  onUpdateRoadmapVersionNodes?: (drafts: EditRoadmapNodeDraft[]) => Promise<void>;
  roadmap: ConceptProjectRoadmapVisualItem[];
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const previousScrollYRef = useRef(0);
  const railScrollerRef = useRef<HTMLDivElement | null>(null);
  const [activeInsertTarget, setActiveInsertTarget] =
    useState<GroupedConceptProjectRoadmapVersion | null>(null);
  const [activeVersion, setActiveVersion] = useState<GroupedConceptProjectRoadmapVersion | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<DeleteRoadmapNodeTarget>(null);
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
  const [insertDescription, setInsertDescription] = useState("");
  const [insertError, setInsertError] = useState<string | null>(null);
  const [insertName, setInsertName] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSavingDelete, setIsSavingDelete] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isSavingInsert, setIsSavingInsert] = useState(false);
  const [editDrafts, setEditDrafts] = useState<EditRoadmapNodeDraft[]>([]);
  const [editError, setEditError] = useState<string | null>(null);
  const groupedVersions = useMemo(
    () => groupConceptProjectRoadmapVersions(roadmap, currentVersion),
    [currentVersion, roadmap],
  );
  const effectiveIsCollapsed = isMobile || (!disableCollapse && isCollapsed);
  const showInsertControls = !effectiveIsCollapsed && canInsertVersions && Boolean(onInsertVersion);

  useEffect(() => {
    if (disableCollapse) {
      setIsCollapsed(false);
      return;
    }

    function handleScroll() {
      const scrollY = window.scrollY;

      setIsCollapsed((current) =>
        getNextRoadmapRailCollapsed({
          collapseThreshold: ROADMAP_RAIL_COLLAPSE_THRESHOLD_PX,
          isCollapsed: current,
          previousScrollY: previousScrollYRef.current,
          scrollY,
        }),
      );

      previousScrollYRef.current = scrollY;
    }

    previousScrollYRef.current = window.scrollY;
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [disableCollapse]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 639px)");

    function syncIsMobile(event?: MediaQueryListEvent) {
      setIsMobile(event?.matches ?? mediaQuery.matches);
    }

    syncIsMobile();
    mediaQuery.addEventListener("change", syncIsMobile);

    return () => {
      mediaQuery.removeEventListener("change", syncIsMobile);
    };
  }, []);

  useLayoutEffect(() => {
    if (!scrollToCurrentVersion) {
      return;
    }

    const railScrollerElement = railScrollerRef.current;

    if (!railScrollerElement) {
      return;
    }

    const currentVersionElement = railScrollerElement.querySelector<HTMLElement>(
      '[data-current-version="true"]',
    );

    if (!currentVersionElement) {
      railScrollerElement.scrollTo({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        left: 0,
      });
      return;
    }

    // Walk up offset parents to get element's left offset relative to the scroll container.
    let elementOffsetLeft = 0;
    let offsetNode: HTMLElement | null = currentVersionElement;

    while (offsetNode && offsetNode !== railScrollerElement) {
      elementOffsetLeft += offsetNode.offsetLeft;
      offsetNode = offsetNode.offsetParent as HTMLElement | null;
    }

    const targetScrollLeft = Math.max(
      0,
      elementOffsetLeft -
        railScrollerElement.clientWidth / 2 +
        currentVersionElement.offsetWidth / 2,
    );

    // Disable scroll-snap so it doesn't fight the programmatic scroll.
    railScrollerElement.style.scrollSnapType = "none";
    railScrollerElement.scrollLeft = targetScrollLeft;

    let frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(() => {
        railScrollerElement.style.scrollSnapType = "";
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [groupedVersions, prefersReducedMotion, scrollToCurrentVersion]);

  if (groupedVersions.length === 0) {
    return null;
  }

  const transition = prefersReducedMotion
    ? { duration: 0 }
    : { damping: 28, mass: 0.85, stiffness: 260, type: "spring" as const };

  function handleOpenInsert(target: GroupedConceptProjectRoadmapVersion) {
    setActiveInsertTarget(target);
    setInsertDescription("");
    setInsertError(null);
    setInsertName("");
  }

  function handleCloseInsert(open: boolean) {
    if (open || isSavingInsert) {
      return;
    }

    setActiveInsertTarget(null);
    setInsertDescription("");
    setInsertError(null);
    setInsertName("");
  }

  function handleOpenEdit(version: GroupedConceptProjectRoadmapVersion) {
    if (!canEditVersions) {
      return;
    }

    setActiveVersion(version);
    setDeleteTarget(null);
    setEditError(null);
    setEditDrafts(
      version.items.map((item) => ({
        description: item.description ?? "",
        id: item.id,
        name: item.name,
      })),
    );
    setExpandedNodeId(version.items[0]?.id ?? null);
  }

  function handleCloseEdit(open: boolean) {
    if (open || isSavingEdit || isSavingDelete) {
      return;
    }

    setActiveVersion(null);
    setDeleteTarget(null);
    setEditDrafts([]);
    setEditError(null);
    setExpandedNodeId(null);
  }

  function updateDraft(
    nodeId: string,
    key: keyof Pick<EditRoadmapNodeDraft, "description" | "name">,
    value: string,
  ) {
    setEditDrafts((drafts) =>
      drafts.map((draft) => (draft.id === nodeId ? { ...draft, [key]: value } : draft)),
    );
  }

  async function handleInsertSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeInsertTarget || !onInsertVersion) {
      return;
    }

    const trimmedName = insertName.trim();
    const trimmedDescription = insertDescription.trim();

    if (!trimmedName) {
      setInsertError("Title cannot be empty.");
      return;
    }

    setInsertError(null);
    setIsSavingInsert(true);

    try {
      await onInsertVersion({
        description: trimmedDescription || undefined,
        majorVersion: activeInsertTarget.insertMajorVersion,
        minorVersion: activeInsertTarget.insertMinorVersion,
        name: trimmedName,
      });
      setActiveInsertTarget(null);
      setInsertDescription("");
      setInsertName("");
    } catch (error) {
      setInsertError(error instanceof Error ? error.message : "Failed to insert the roadmap node.");
    } finally {
      setIsSavingInsert(false);
    }
  }

  async function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!onUpdateRoadmapVersionNodes) {
      return;
    }

    if (editDrafts.some((draft) => !draft.name.trim())) {
      setEditError("Every roadmap node needs a title.");
      return;
    }

    setEditError(null);
    setIsSavingEdit(true);

    try {
      await onUpdateRoadmapVersionNodes(
        editDrafts.map((draft) => ({
          description: draft.description.trim(),
          id: draft.id,
          name: draft.name.trim(),
        })),
      );
      setActiveVersion(null);
      setEditDrafts([]);
      setExpandedNodeId(null);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "Failed to save roadmap node changes.");
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget || !onDeleteRoadmapNode) {
      return;
    }

    setIsSavingDelete(true);

    try {
      await onDeleteRoadmapNode(deleteTarget.id);
      setDeleteTarget(null);

      if (activeVersion) {
        const nextDrafts = editDrafts.filter((draft) => draft.id !== deleteTarget.id);
        setEditDrafts(nextDrafts);

        if (nextDrafts.length === 0) {
          setActiveVersion(null);
          setExpandedNodeId(null);
        } else {
          setExpandedNodeId(nextDrafts[0]?.id ?? null);
        }
      }
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "Failed to delete roadmap node.");
      setDeleteTarget(null);
    } finally {
      setIsSavingDelete(false);
    }
  }

  return (
    <>
      <motion.section
        animate={{
          paddingBottom: effectiveIsCollapsed ? 8 : 12,
          paddingTop: effectiveIsCollapsed ? 4 : 10,
        }}
        className={cn(
          "fixed inset-x-0 top-15 z-10 min-w-0 overflow-hidden px-4 sm:px-6",
          className,
        )}
        transition={transition}
      >
        <div className="mx-auto w-full max-w-350">
          <div className="relative min-w-0 overflow-hidden rounded border border-border/70 bg-background/88 backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,23,42,0.08),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.8),rgba(248,250,252,0.92))]" />

            <motion.div
              animate={{
                height: effectiveIsCollapsed ? 0 : "auto",
                opacity: effectiveIsCollapsed ? 0 : 1,
              }}
              className="relative overflow-hidden border-b border-border/60"
              transition={transition}
            >
              <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground/80">
                    Roadmap
                  </p>
                </div>
                {currentVersion ? (
                  <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700">
                    Current {`v${currentVersion.currentMajor}.${currentVersion.currentMinor}`}
                  </div>
                ) : null}
              </div>
            </motion.div>

            <div
              className="relative min-w-0 max-w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden px-3 py-3 sm:px-4"
              ref={railScrollerRef}
            >
              <div className="flex w-max min-w-full items-center gap-2 pr-2 sm:gap-3">
                {groupedVersions.map((version, index) => {
                  const showInsertAfter = showInsertControls && version.canInsertAfter;
                  const isLastVersion = index === groupedVersions.length - 1;

                  return (
                    <div className="contents" key={version.version}>
                      <motion.button
                        animate={{
                          width: effectiveIsCollapsed ? "5rem" : 152,
                          paddingBottom: effectiveIsCollapsed ? 8 : 14,
                          paddingTop: effectiveIsCollapsed ? 8 : 14,
                        }}
                        className={cn(
                          "relative shrink-0 snap-center overflow-hidden rounded-2xl border px-3 text-left transition-colors sm:px-4",
                          canEditVersions && "cursor-pointer hover:border-foreground/50",
                          version.isCurrent
                            ? "border-foreground bg-foreground text-background"
                            : "border-border/70 bg-background/88 text-foreground",
                        )}
                        data-current-version={version.isCurrent ? "true" : undefined}
                        onClick={() => handleOpenEdit(version)}
                        transition={transition}
                        type="button"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "font-mono text-xs font-semibold tracking-tight",
                              version.isCurrent ? "text-background/92" : "text-muted-foreground",
                            )}
                          >
                            {version.version}
                          </span>
                          {version.itemCount > 1 ? (
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                version.isCurrent
                                  ? "bg-background/15 text-background/88"
                                  : "bg-foreground/6 text-muted-foreground",
                              )}
                            >
                              +{version.itemCount - 1}
                            </span>
                          ) : null}
                        </div>

                        <motion.div
                          animate={{
                            height: effectiveIsCollapsed ? 0 : "auto",
                            marginTop: effectiveIsCollapsed ? 0 : 10,
                            opacity: effectiveIsCollapsed ? 0 : 1,
                            y: effectiveIsCollapsed ? -8 : 0,
                          }}
                          className="overflow-hidden"
                          transition={transition}
                        >
                          <p
                            className={cn(
                              "line-clamp-2 text-sm font-medium",
                              version.isCurrent && "text-background",
                            )}
                          >
                            {version.label}
                          </p>
                        </motion.div>
                      </motion.button>

                      {isLastVersion ? (
                        showInsertAfter ? (
                          <div className="flex h-9 w-10 shrink-0 items-center justify-center">
                            <Button
                              aria-label={`Insert a roadmap node after ${version.version}`}
                              className="size-6 rounded-full border border-border bg-background px-0 shadow-none"
                              onClick={() => handleOpenInsert(version)}
                              size="icon"
                              type="button"
                              variant="outline"
                            >
                              <PlusIcon className="size-3.5" />
                            </Button>
                          </div>
                        ) : null
                      ) : showInsertAfter ? (
                        <div className="relative flex h-9 w-10 shrink-0 items-center justify-center">
                          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 rounded-full bg-border" />
                          <Button
                            aria-label={`Insert a roadmap node after ${version.version}`}
                            className="relative size-6 rounded-full border border-border bg-background px-0 shadow-none"
                            onClick={() => handleOpenInsert(version)}
                            size="icon"
                            type="button"
                            variant="outline"
                          >
                            <PlusIcon className="size-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <motion.div
                          animate={{
                            opacity: effectiveIsCollapsed ? 0.55 : 1,
                            width: effectiveIsCollapsed ? 20 : 34,
                          }}
                          className="h-px shrink-0 rounded-full bg-border"
                          transition={transition}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <Dialog onOpenChange={handleCloseInsert} open={Boolean(activeInsertTarget)}>
        <DialogContent>
          <form className="space-y-4" onSubmit={handleInsertSubmit}>
            <DialogHeader>
              <DialogTitle>Insert Roadmap Node</DialogTitle>
              <DialogDescription>
                {activeInsertTarget ? getInsertionDescription(activeInsertTarget) : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="roadmap-node-title">
                Title
              </label>
              <input
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                id="roadmap-node-title"
                onChange={(event) => setInsertName(event.target.value)}
                value={insertName}
              />
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="roadmap-node-description"
              >
                Description
              </label>
              <textarea
                className="min-h-28 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                id="roadmap-node-description"
                onChange={(event) => setInsertDescription(event.target.value)}
                value={insertDescription}
              />
            </div>

            {insertError ? (
              <Alert variant="destructive">
                <AlertTitle>Insert failed</AlertTitle>
                <AlertDescription>{insertError}</AlertDescription>
              </Alert>
            ) : null}

            <DialogFooter>
              <Button disabled={!insertName.trim() || isSavingInsert} type="submit">
                {isSavingInsert ? "Creating..." : "Create roadmap node"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={handleCloseEdit} open={Boolean(activeVersion)}>
        <DialogContent className="max-w-2xl!">
          <form className="space-y-4" onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Roadmap Version</DialogTitle>
              <DialogDescription>
                {activeVersion
                  ? `Edit the Roadmap Nodes in ${activeVersion.version}.`
                  : "Edit the Roadmap Nodes in this version."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              {editDrafts.map((draft) => {
                const isExpanded = expandedNodeId === draft.id || editDrafts.length === 1;

                return (
                  <div className="overflow-hidden rounded-xl border" key={draft.id}>
                    {editDrafts.length > 1 ? (
                      <button
                        className="flex w-full items-center justify-between gap-3 bg-muted/40 px-4 py-3 text-left"
                        onClick={() => setExpandedNodeId(isExpanded ? null : draft.id)}
                        type="button"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {draft.name.trim() || "Untitled roadmap node"}
                          </p>
                          <p className="line-clamp-1 text-xs text-muted-foreground">
                            {draft.description.trim() || "No description"}
                          </p>
                        </div>
                        <ChevronDownIcon
                          className={cn("size-4 transition-transform", isExpanded && "rotate-180")}
                        />
                      </button>
                    ) : null}

                    {isExpanded ? (
                      <div className="space-y-4 px-4 py-4">
                        <div className="space-y-2">
                          <label
                            className="text-sm font-medium text-foreground"
                            htmlFor={`roadmap-node-title-${draft.id}`}
                          >
                            Title
                          </label>
                          <input
                            className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                            id={`roadmap-node-title-${draft.id}`}
                            onChange={(event) => updateDraft(draft.id, "name", event.target.value)}
                            value={draft.name}
                          />
                        </div>

                        <div className="space-y-2">
                          <label
                            className="text-sm font-medium text-foreground"
                            htmlFor={`roadmap-node-description-${draft.id}`}
                          >
                            Description
                          </label>
                          <textarea
                            className="min-h-24 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                            id={`roadmap-node-description-${draft.id}`}
                            onChange={(event) =>
                              updateDraft(draft.id, "description", event.target.value)
                            }
                            value={draft.description}
                          />
                        </div>

                        <div className="flex justify-end">
                          <Button
                            onClick={() =>
                              setDeleteTarget({
                                id: draft.id,
                                name: draft.name.trim() || "Untitled roadmap node",
                                versionLabel: activeVersion?.version || "",
                              })
                            }
                            type="button"
                            variant="destructive"
                          >
                            <Trash2Icon />
                            Delete node
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {editError ? (
              <Alert variant="destructive">
                <AlertTitle>Save failed</AlertTitle>
                <AlertDescription>{editError}</AlertDescription>
              </Alert>
            ) : null}

            <DialogFooter>
              <Button disabled={isSavingEdit || editDrafts.length === 0} type="submit">
                {isSavingEdit ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open && !isSavingDelete) {
            setDeleteTarget(null);
          }
        }}
        open={Boolean(deleteTarget)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Roadmap Node</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `Delete ${deleteTarget.name} from ${deleteTarget.versionLabel}? This repairs the roadmap version sequence and cannot be undone.`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              disabled={isSavingDelete}
              onClick={() => setDeleteTarget(null)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isSavingDelete}
              onClick={handleDeleteConfirm}
              type="button"
              variant="destructive"
            >
              {isSavingDelete ? "Deleting..." : "Delete node"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
