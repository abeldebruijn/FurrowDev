import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRightIcon } from "lucide-react";

import { Button, buttonVariants } from "../../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import type { WidgetProjectVision } from "../../../lib/widgets/types";
import { cn } from "../../../lib/utils";

type VisionWidgetActionRenderer = (vision: WidgetProjectVision) => ReactNode;

type VisionWidgetFooterRenderer = () => ReactNode;
type VisionWidgetHeaderActionRenderer = () => ReactNode;

export type VisionWidgetLayout = {
  maxRows: number;
  showCollaborators: boolean;
  showOwner: boolean;
  showUpdatedAt: boolean;
};

export function getVisionWidgetLayout(width: number, height: number): VisionWidgetLayout {
  const clampedWidth = Math.max(1, Math.min(width, 3));
  const baseMaxRowsByWidth: Record<1 | 2 | 3, number> = {
    1: 2,
    2: 3,
    3: 4,
  };
  const baseMaxRows = baseMaxRowsByWidth[clampedWidth as 1 | 2 | 3];

  return {
    maxRows: baseMaxRows + (height >= 3 ? 1 : 0),
    showCollaborators: clampedWidth >= 3,
    showOwner: clampedWidth >= 2,
    showUpdatedAt: clampedWidth >= 2,
  };
}

export function formatVisionWidgetUpdatedAt(updatedAt: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(updatedAt));
}

export function getVisionCollaboratorsLabel(
  collaborators: WidgetProjectVision["collaborators"],
): string {
  return collaborators.length > 0
    ? collaborators.map((collaborator) => collaborator.name).join(", ")
    : "Private to owner";
}

export function renderVisionWidgetActionButtonLabel() {
  return "Open";
}

export function renderVisionWidgetFooterLabel() {
  return "View all visions";
}

export function VisionWidgetCard({
  visions,
  width,
  height,
  renderHeaderAction,
  renderAction,
  renderFooter,
}: {
  visions: WidgetProjectVision[];
  width: number;
  height: number;
  renderHeaderAction?: VisionWidgetHeaderActionRenderer;
  renderAction: VisionWidgetActionRenderer;
  renderFooter: VisionWidgetFooterRenderer;
}) {
  const layout = getVisionWidgetLayout(width, height);
  const visibleVisions = visions.slice(0, layout.maxRows);
  const showFooter = visions.length > layout.maxRows;

  return (
    <section className="flex h-full min-h-0 flex-col rounded-xl border border-border/70 bg-background p-1">
      <div className="flex items-center justify-between gap-2 px-2 pt-2">
        <p className="text-sm font-medium text-muted-foreground/80">Visions</p>
        {renderHeaderAction ? renderHeaderAction() : null}
      </div>

      <div className="mt-1 flex min-h-0 flex-1 flex-col overflow-hidden">
        {visions.length === 0 ? (
          <div className="flex h-full flex-col justify-center gap-1 px-3 py-4">
            <p className="text-sm font-medium text-foreground">No visions yet</p>
            <p className="text-xs leading-5 text-muted-foreground">
              Start a vision to explore an idea in private.
            </p>
          </div>
        ) : (
          <Table className="table-fixed">
            {height > 2 ? (
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-9 px-3 text-[11px] font-medium">Title</TableHead>
                  {layout.showOwner ? (
                    <TableHead className="h-9 px-3 text-[11px] font-medium">Owner</TableHead>
                  ) : null}
                  {layout.showCollaborators ? (
                    <TableHead className="h-9 px-3 text-[11px] font-medium">
                      Collaborators
                    </TableHead>
                  ) : null}
                  {layout.showUpdatedAt ? (
                    <TableHead className="h-9 px-3 text-[11px] font-medium">Last updated</TableHead>
                  ) : null}
                  <TableHead className="h-9 px-3 text-right text-[11px] font-medium">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
            ) : null}
            <TableBody>
              {visibleVisions.map((vision) => (
                <TableRow key={vision.id}>
                  <TableCell className="px-3 py-2 text-xs font-medium">
                    <p className="line-clamp-1">{vision.title}</p>
                  </TableCell>
                  {layout.showOwner ? (
                    <TableCell className="px-3 py-2 text-xs">
                      <p className="line-clamp-1">{vision.ownerName}</p>
                    </TableCell>
                  ) : null}
                  {layout.showCollaborators ? (
                    <TableCell className="px-3 py-2 text-xs text-muted-foreground">
                      <p className="line-clamp-1">
                        {getVisionCollaboratorsLabel(vision.collaborators)}
                      </p>
                    </TableCell>
                  ) : null}
                  {layout.showUpdatedAt ? (
                    <TableCell className="px-3 py-2 text-xs">
                      <p className="line-clamp-1">
                        {formatVisionWidgetUpdatedAt(vision.updatedAt)}
                      </p>
                    </TableCell>
                  ) : null}
                  <TableCell className="px-3 py-2 text-right">{renderAction(vision)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {showFooter ? renderFooter() : null}
    </section>
  );
}

export function VisionWidgetActionButton({ href }: { href: string }) {
  return (
    <Link href={href}>
      <Button className="h-8 px-3 text-xs" size="sm" variant="outline">
        {renderVisionWidgetActionButtonLabel()}
      </Button>
    </Link>
  );
}

export function VisionWidgetFooterLink({ href }: { href: string }) {
  return (
    <Link
      className={cn(
        buttonVariants({ size: "sm", variant: "ghost" }),
        "mt-1 h-8 justify-between px-2 text-xs",
      )}
      href={href}
    >
      {renderVisionWidgetFooterLabel()}
      <ArrowRightIcon className="size-3.5" />
    </Link>
  );
}

export function VisionWidgetPreviewAction() {
  return (
    <div
      className={cn(
        buttonVariants({ size: "sm", variant: "outline" }),
        "pointer-events-none h-8 px-3 text-xs",
      )}
    >
      {renderVisionWidgetActionButtonLabel()}
    </div>
  );
}

export function VisionWidgetPreviewFooter() {
  return (
    <div
      className={cn(
        buttonVariants({ size: "sm", variant: "ghost" }),
        "mt-1 h-8 justify-between px-2 text-xs",
      )}
    >
      {renderVisionWidgetFooterLabel()}
      <ArrowRightIcon className="size-3.5" />
    </div>
  );
}

export function VisionWidgetPreviewCreateButton() {
  return (
    <div className={cn(buttonVariants({ size: "xs" }), "pointer-events-none")}>New vision</div>
  );
}
