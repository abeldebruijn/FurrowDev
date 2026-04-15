"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";

import {
  groupConceptProjectRoadmapVersions,
  type GroupedConceptProjectRoadmapVersion,
} from "../../../lib/concept-project/roadmap";
import type { WidgetProps } from "../../../lib/widgets/types";
import { cn } from "../../../lib/utils";

export function getInitialRoadmapWidgetIndex(versions: GroupedConceptProjectRoadmapVersion[]) {
  const currentIndex = versions.findIndex((version) => version.isCurrent);

  return currentIndex >= 0 ? currentIndex : 0;
}

export function getNextRoadmapWidgetIndex(
  currentIndex: number,
  direction: "next" | "previous",
  versions: GroupedConceptProjectRoadmapVersion[],
) {
  if (versions.length === 0) {
    return 0;
  }

  if (direction === "previous") {
    return Math.max(0, currentIndex - 1);
  }

  return Math.min(versions.length - 1, currentIndex + 1);
}

export default function RoadmapWidget({ project }: WidgetProps) {
  const groupedVersions = useMemo(
    () =>
      groupConceptProjectRoadmapVersions(
        project.roadmapItems,
        project.roadmap
          ? {
              currentMajor: project.roadmap.currentMajor,
              currentMinor: project.roadmap.currentMinor,
            }
          : null,
      ),
    [project.roadmap, project.roadmapItems],
  );
  const [activeIndex, setActiveIndex] = useState(() =>
    getInitialRoadmapWidgetIndex(groupedVersions),
  );
  const activeVersion = groupedVersions[activeIndex] ?? null;
  const roadmapHref = `/project/${project.projectId}/roadmap#current-version`;

  useEffect(() => {
    setActiveIndex(getInitialRoadmapWidgetIndex(groupedVersions));
  }, [groupedVersions]);

  return (
    <section className="flex h-full min-h-0 flex-col rounded-xl border border-border/70 bg-background p-1">
      <div className="flex items-start justify-between gap-2 px-2 pt-2">
        <div className="min-w-0 flex items-end gap-2">
          <p className="text-sm font-medium text-muted-foreground/80">Roadmap</p>
          {project.roadmap ? (
            <p className="text-xs font-medium text-foreground">
              Current v{project.roadmap.currentMajor}.{project.roadmap.currentMinor}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {groupedVersions.length > 0 ? (
            <p className="mr-1 text-[11px] text-muted-foreground">
              {activeIndex + 1} / {groupedVersions.length}
            </p>
          ) : null}
          <button
            aria-label="Previous roadmap item"
            className="inline-flex size-7 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
            disabled={activeIndex === 0 || groupedVersions.length === 0}
            onClick={() =>
              setActiveIndex((currentIndex) =>
                getNextRoadmapWidgetIndex(currentIndex, "previous", groupedVersions),
              )
            }
            type="button"
          >
            <ArrowLeftIcon className="size-3.5" />
          </button>
          <button
            aria-label="Next roadmap item"
            className="inline-flex size-7 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
            disabled={activeIndex >= groupedVersions.length - 1 || groupedVersions.length === 0}
            onClick={() =>
              setActiveIndex((currentIndex) =>
                getNextRoadmapWidgetIndex(currentIndex, "next", groupedVersions),
              )
            }
            type="button"
          >
            <ArrowRightIcon className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-2 flex min-h-0 flex-1 flex-col rounded-lg border border-border/60 bg-muted/20 p-3 relative">
        {activeVersion ? (
          <>
            <div className="flex items-center gap-2 absolute top-2 right-2">
              <p className="font-mono text-[11px] font-semibold tracking-tight text-muted-foreground">
                {activeVersion.version}
              </p>
              {activeVersion.itemCount > 1 ? (
                <span className="rounded-full border border-border/70 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  +{activeVersion.itemCount - 1}
                </span>
              ) : null}
              {activeVersion.isCurrent ? (
                <span className="rounded-full bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background font-sans">
                  now
                </span>
              ) : null}
            </div>

            <p className="line-clamp-2 text-sm font-medium text-foreground">
              {activeVersion.label}
            </p>

            <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">
              {getRoadmapWidgetDescription(activeVersion)}
            </p>
          </>
        ) : (
          <div className="flex h-full flex-col justify-between gap-3">
            <p className="text-sm font-medium text-foreground">No roadmap yet</p>
            <p className="text-xs leading-5 text-muted-foreground">
              Add roadmap versions to show current progress here.
            </p>
          </div>
        )}
      </div>

      <Link
        className={cn(
          "mt-1 inline-flex h-8 items-center justify-between rounded-lg px-2 text-xs font-medium text-foreground transition-colors hover:bg-muted",
        )}
        href={roadmapHref}
      >
        View roadmap
        <ArrowRightIcon className="size-3.5" />
      </Link>
    </section>
  );
}

function getRoadmapWidgetDescription(version: GroupedConceptProjectRoadmapVersion) {
  const primaryDescription = version.items
    .find((item) => item.description?.trim())
    ?.description?.trim();

  if (primaryDescription) {
    return primaryDescription;
  }

  if (version.itemCount > 1) {
    return `${version.itemCount} roadmap items grouped in this release.`;
  }

  return "No additional notes for this roadmap item yet.";
}
