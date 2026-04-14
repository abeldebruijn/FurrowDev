"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import Link from "next/link";
import type { RefObject } from "react";
import { Trash2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { widgetRegistry } from "@/components/widgets/registry";
import { cn } from "@/lib/utils";
import { getWidgetSizeVariants } from "@/lib/widgets/layout";
import type { WidgetConfig, WidgetSizeVariant } from "@/lib/widgets/types";

import { PreviewWidgetCard } from "./widget-card";

export function AddWidgetPanel({
  activeDeleteDrag,
  deleteDropZoneRef,
  panelBoundaryRef,
  onPreviewDragEnd,
  onPreviewDragMove,
  onPreviewDragStart,
  projectId,
}: {
  activeDeleteDrag: boolean;
  deleteDropZoneRef: RefObject<HTMLDivElement | null>;
  panelBoundaryRef: RefObject<HTMLDivElement | null>;
  onPreviewDragEnd: (widget: WidgetSizeVariant, point: { x: number; y: number }) => void;
  onPreviewDragMove: (widget: WidgetSizeVariant, point: { x: number; y: number }) => void;
  onPreviewDragStart: (widget: WidgetSizeVariant) => void;
  projectId: string;
}) {
  const [filterWidget, setFilterWidget] = useState("");
  const prefersReducedMotion = useReducedMotion() ?? false;

  const selectedWidget =
    filterWidget === ""
      ? null
      : (widgetRegistry.find((widget) => widget.options.name === filterWidget) ?? null);

  return (
    <div
      className="fixed inset-x-6 bottom-0 mx-auto grid h-1/2 max-h-128 max-w-6xl grid-cols-[200px_minmax(0,1fr)] overflow-hidden rounded-t-2xl border border-border bg-background shadow-2xl"
      ref={panelBoundaryRef}
    >
      <aside className="flex flex-col border-r border-border/70 bg-muted/30 overflow-y-auto">
        <div className="flex-1 overflow-y-auto p-3">
          <div className="flex flex-col gap-1">
            <Button
              variant={filterWidget === "" ? "default" : "ghost"}
              className="justify-start py-5 font-serif text-sm font-medium"
              onClick={() => setFilterWidget("")}
            >
              Alle widgets
            </Button>

            {widgetRegistry.map((widget) => {
              const { name } = widget.options;

              return (
                <Button
                  key={name}
                  variant={filterWidget === name ? "default" : "ghost"}
                  className="justify-start rounded-xl px-3 py-5 font-serif text-sm transition-colors"
                  onClick={() => setFilterWidget(name)}
                >
                  {name}
                </Button>
              );
            })}
          </div>
        </div>
      </aside>

      <section className="flex min-h-0 flex-col bg-background">
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-2">
          <p className="text-sm font-medium text-muted-foreground">
            {filterWidget ? `${filterWidget} widgets` : "All widgets"}
          </p>

          <div className="flex items-center gap-2">
            {activeDeleteDrag ? (
              <div
                className="flex items-center gap-2 rounded border border-dashed border-destructive/50 bg-destructive/10 px-3 py-1.5 text-sm text-destructive"
                ref={deleteDropZoneRef}
              >
                <Trash2 className="size-3" />
                Drag here to delete widget
              </div>
            ) : null}

            <Link
              className={cn(buttonVariants({ size: "sm" }), "border")}
              href={`/project/${projectId}`}
            >
              Done
            </Link>
          </div>
        </div>

        <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-5">
          {selectedWidget ? (
            <Widgets
              onPreviewDragEnd={onPreviewDragEnd}
              onPreviewDragMove={onPreviewDragMove}
              onPreviewDragStart={onPreviewDragStart}
              prefersReducedMotion={prefersReducedMotion}
              widget={selectedWidget}
            />
          ) : (
            <AllWidgets
              onPreviewDragEnd={onPreviewDragEnd}
              onPreviewDragMove={onPreviewDragMove}
              onPreviewDragStart={onPreviewDragStart}
              prefersReducedMotion={prefersReducedMotion}
              widgets={widgetRegistry}
            />
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border/70 bg-muted/25 px-5 py-2">
          <p className="text-sm font-medium text-foreground">
            Drag a widget to place it on the board.
          </p>
        </div>
      </section>
    </div>
  );
}

function AllWidgets({
  widgets,
  onPreviewDragEnd,
  onPreviewDragMove,
  onPreviewDragStart,
  prefersReducedMotion,
}: {
  widgets: WidgetConfig[];
  onPreviewDragEnd: (widget: WidgetSizeVariant, point: { x: number; y: number }) => void;
  onPreviewDragMove: (widget: WidgetSizeVariant, point: { x: number; y: number }) => void;
  onPreviewDragStart: (widget: WidgetSizeVariant) => void;
  prefersReducedMotion: boolean;
}) {
  return (
    <div className="grid min-w-0 grid-cols-2 items-center gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {widgets.flatMap((widget) =>
        getWidgetSizes(widget).map((size) => (
          <WidgetPreview
            key={size.key}
            onPreviewDragEnd={onPreviewDragEnd}
            onPreviewDragMove={onPreviewDragMove}
            onPreviewDragStart={onPreviewDragStart}
            prefersReducedMotion={prefersReducedMotion}
            size={size}
            widget={widget}
          />
        )),
      )}
    </div>
  );
}

function Widgets({
  widget,
  onPreviewDragEnd,
  onPreviewDragMove,
  onPreviewDragStart,
  prefersReducedMotion,
}: {
  widget: WidgetConfig;
  onPreviewDragEnd: (widget: WidgetSizeVariant, point: { x: number; y: number }) => void;
  onPreviewDragMove: (widget: WidgetSizeVariant, point: { x: number; y: number }) => void;
  onPreviewDragStart: (widget: WidgetSizeVariant) => void;
  prefersReducedMotion: boolean;
}) {
  const sizes = getWidgetSizes(widget);

  return (
    <div className="grid min-w-0 grid-cols-2 items-center gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {sizes.map((size) => (
        <WidgetPreview
          key={size.key}
          onPreviewDragEnd={onPreviewDragEnd}
          onPreviewDragMove={onPreviewDragMove}
          onPreviewDragStart={onPreviewDragStart}
          prefersReducedMotion={prefersReducedMotion}
          size={size}
          widget={widget}
        />
      ))}
    </div>
  );
}

function WidgetPreview({
  widget,
  size,
  onPreviewDragEnd,
  onPreviewDragMove,
  onPreviewDragStart,
  prefersReducedMotion,
}: {
  widget: WidgetConfig;
  size: WidgetSizeVariant;
  onPreviewDragEnd: (widget: WidgetSizeVariant, point: { x: number; y: number }) => void;
  onPreviewDragMove: (widget: WidgetSizeVariant, point: { x: number; y: number }) => void;
  onPreviewDragStart: (widget: WidgetSizeVariant) => void;
  prefersReducedMotion: boolean;
}) {
  const transition = prefersReducedMotion
    ? { duration: 0 }
    : { damping: 28, mass: 0.8, stiffness: 280, type: "spring" as const };

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragSnapToOrigin
      onDragEnd={(event, info) => onPreviewDragEnd(size, getClientPoint(event, info.point))}
      onDrag={(event, info) => onPreviewDragMove(size, getClientPoint(event, info.point))}
      onDragStart={() => onPreviewDragStart(size)}
      transition={transition}
      whileDrag={{
        rotate: 1.5,
        scale: 1.03,
        zIndex: 60,
      }}
    >
      <PreviewWidgetCard size={size}>
        {widget.router({ width: size.width, height: size.height })}
      </PreviewWidgetCard>
    </motion.div>
  );
}

function getWidgetSizes(widget: WidgetConfig) {
  return getWidgetSizeVariants(widget);
}

function getClientPoint(
  event: MouseEvent | PointerEvent | TouchEvent,
  fallback: { x: number; y: number },
) {
  if ("clientX" in event && "clientY" in event) {
    return {
      x: event.clientX,
      y: event.clientY,
    };
  }

  return fallback;
}
