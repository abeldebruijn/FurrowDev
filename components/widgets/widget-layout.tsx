"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";

import type { ProjectAccess } from "@/lib/project/server";
import { buttonVariants } from "@/components/ui/button";
import { AddWidgetPanel } from "./add-widget-panel";
import { cn } from "@/lib/utils";
import {
  createTemporaryWidgetItem,
  getInitialTemporaryWidgetItems,
  getPackedItemCenter,
  packWidgetItems,
  normalizeWidgetOrder,
} from "@/lib/widgets/layout";
import type { TemporaryWidgetItem, WidgetSizeVariant } from "@/lib/widgets/types";
import { widgetRegistry } from "./registry";

export function WidgetLayout({
  layout,
  projectId,
  widgetEdit,
}: {
  layout: ProjectAccess["layout"];
  projectId: string;
  widgetEdit: boolean;
}) {
  const [hasHydrated, setHasHydrated] = useState(false);
  const [items, setItems] = useState<TemporaryWidgetItem[]>(() =>
    getInitialTemporaryWidgetItems(layout),
  );
  const [activePreviewDrag, setActivePreviewDrag] = useState<WidgetSizeVariant | null>(null);
  const [activePreviewPoint, setActivePreviewPoint] = useState<{ x: number; y: number } | null>(
    null,
  );
  const dropZoneRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const packedItems = useMemo(() => packWidgetItems(items), [items]);
  const widgetsByName = useMemo(
    () => new Map(widgetRegistry.map((widget) => [widget.options.name, widget])),
    [],
  );
  const transition = prefersReducedMotion
    ? { duration: 0 }
    : { damping: 30, mass: 0.9, stiffness: 260, type: "spring" as const };
  const previewPackedItem = useMemo(() => {
    if (!activePreviewDrag) {
      return null;
    }

    if (!isPointInsideRect(activePreviewPoint, dropZoneRef.current?.getBoundingClientRect())) {
      return null;
    }

    const previewItem = createTemporaryWidgetItem(activePreviewDrag, items.length);
    const candidateItems = normalizeWidgetOrder([...items, previewItem]);

    return packWidgetItems(candidateItems).find((item) => item.id === previewItem.id) ?? null;
  }, [activePreviewDrag, activePreviewPoint, items]);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  function handlePreviewDragStart(widget: WidgetSizeVariant) {
    setActivePreviewDrag(widget);
    setActivePreviewPoint(null);
  }

  function handlePreviewDragMove(widget: WidgetSizeVariant, point: { x: number; y: number }) {
    setActivePreviewDrag(widget);
    setActivePreviewPoint(point);
  }

  function handlePreviewDragEnd(widget: WidgetSizeVariant, point: { x: number; y: number }) {
    setActivePreviewDrag(null);
    setActivePreviewPoint(null);

    if (!isPointInsideRect(point, dropZoneRef.current?.getBoundingClientRect())) {
      return;
    }

    setItems((current) =>
      normalizeWidgetOrder([...current, createTemporaryWidgetItem(widget, current.length)]),
    );
  }

  function handlePlacedWidgetDragEnd(itemId: string, point: { x: number; y: number }) {
    const rect = dropZoneRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    if (!isPointInsideRect(point, rect)) {
      return;
    }

    setItems((current) =>
      reorderWidgetItems(
        current,
        itemId,
        {
          x: point.x - rect.left,
          y: point.y - rect.top,
        },
        rect.width,
      ),
    );
  }

  if (packedItems.length === 0) {
    return (
      <OnBoardWidgetLayout
        activePreviewDrag={activePreviewDrag}
        previewPackedItem={previewPackedItem}
        dropZoneRef={dropZoneRef}
        onPreviewDragEnd={handlePreviewDragEnd}
        onPreviewDragMove={handlePreviewDragMove}
        onPreviewDragStart={handlePreviewDragStart}
        projectId={projectId}
        widgetEdit={widgetEdit}
      />
    );
  }

  return (
    <>
      <section
        className={cn(
          "rounded-2xl border border-border bg-muted/20 p-4 transition-colors",
          activePreviewDrag ? "border-foreground/30 bg-muted/40" : undefined,
        )}
      >
        <div className="grid auto-rows-[96px] grid-cols-3 gap-4" ref={dropZoneRef}>
          {previewPackedItem ? (
            <div
              className="rounded-2xl border border-dashed border-foreground/40 bg-background/60 p-4"
              style={{
                gridColumn: `${previewPackedItem.xPos + 1} / span ${previewPackedItem.width}`,
                gridRow: `${previewPackedItem.yPos + 1} / span ${previewPackedItem.height}`,
              }}
            >
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 text-sm text-muted-foreground">
                {previewPackedItem.widgetName} {previewPackedItem.width}x{previewPackedItem.height}
              </div>
            </div>
          ) : null}
          {packedItems.map((item) => {
            const widget = widgetsByName.get(item.widgetName);

            if (!widget) {
              return null;
            }

            return (
              <motion.div
                drag={widgetEdit}
                dragMomentum={false}
                dragSnapToOrigin
                key={item.id}
                layout
                onDragEnd={(_, info) => handlePlacedWidgetDragEnd(item.id, info.point)}
                transition={transition}
                whileDrag={{
                  rotate: 1,
                  scale: 1.02,
                  zIndex: 50,
                }}
                className="rounded-2xl border border-border bg-background p-4 shadow-sm"
                style={{
                  gridColumn: `${item.xPos + 1} / span ${item.width}`,
                  gridRow: `${item.yPos + 1} / span ${item.height}`,
                }}
              >
                <div className="flex h-full flex-col justify-between gap-3">
                  <div className="text-sm font-medium text-foreground">{item.widgetName}</div>
                  <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 p-3 text-sm text-muted-foreground">
                    {widget.router({ width: item.width, height: item.height })}
                  </div>
                  {widgetEdit ? (
                    <p className="text-xs text-muted-foreground">
                      {item.width}x{item.height}
                    </p>
                  ) : null}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {widgetEdit ? (
        <AddWidgetPanel
          onPreviewDragEnd={handlePreviewDragEnd}
          onPreviewDragMove={handlePreviewDragMove}
          onPreviewDragStart={handlePreviewDragStart}
          projectId={projectId}
        />
      ) : null}
    </>
  );
}

export function OnBoardWidgetLayout({
  activePreviewDrag,
  previewPackedItem,
  dropZoneRef,
  onPreviewDragEnd,
  onPreviewDragMove,
  onPreviewDragStart,
  projectId,
  widgetEdit,
}: {
  activePreviewDrag: WidgetSizeVariant | null;
  previewPackedItem: (TemporaryWidgetItem & { xPos: number; yPos: number }) | null;
  dropZoneRef: RefObject<HTMLDivElement | null>;
  onPreviewDragEnd: (widget: WidgetSizeVariant, point: { x: number; y: number }) => void;
  onPreviewDragMove: (widget: WidgetSizeVariant, point: { x: number; y: number }) => void;
  onPreviewDragStart: (widget: WidgetSizeVariant) => void;
  projectId: string;
  widgetEdit: boolean;
}) {
  return (
    <>
      <section
        className={cn(
          "mt-4 grid min-h-64 auto-rows-[96px] grid-cols-3 gap-4 rounded-2xl border border-dashed border-border bg-muted/10 p-6 text-center text-sm text-muted-foreground transition-colors",
          activePreviewDrag ? "border-foreground/30 bg-muted/30" : undefined,
        )}
        ref={dropZoneRef}
      >
        {!widgetEdit ? (
          <div className="col-span-3 flex flex-col gap-2 min-h-48 items-center justify-center">
            <p>You do not have any widgets.</p>
            <Link
              aria-disabled={widgetEdit}
              className={cn(
                buttonVariants({ size: "sm" }),
                widgetEdit ? "pointer-events-none opacity-50" : undefined,
              )}
              href={`/project/${projectId}?widgetEdit=true`}
            >
              Add Widgets
            </Link>
          </div>
        ) : previewPackedItem ? (
          <div
            className="rounded-2xl border border-dashed border-foreground/40 bg-background/60 p-4"
            style={{
              gridColumn: `${previewPackedItem.xPos + 1} / span ${previewPackedItem.width}`,
              gridRow: `${previewPackedItem.yPos + 1} / span ${previewPackedItem.height}`,
            }}
          >
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 text-sm text-muted-foreground">
              {previewPackedItem.widgetName} {previewPackedItem.width}x{previewPackedItem.height}
            </div>
          </div>
        ) : (
          <div className="col-span-3 flex min-h-48 items-center justify-center">
            Drag a widget here to start building the layout.
          </div>
        )}
      </section>

      {widgetEdit ? (
        <AddWidgetPanel
          onPreviewDragEnd={onPreviewDragEnd}
          onPreviewDragMove={onPreviewDragMove}
          onPreviewDragStart={onPreviewDragStart}
          projectId={projectId}
        />
      ) : null}
    </>
  );
}

function isPointInsideRect(point: { x: number; y: number } | null, rect?: DOMRect | null) {
  if (!point || !rect) {
    return false;
  }

  return (
    point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom
  );
}

function reorderWidgetItems(
  items: TemporaryWidgetItem[],
  itemId: string,
  point: { x: number; y: number },
  containerWidth: number,
) {
  const draggedItem = items.find((item) => item.id === itemId);

  if (!draggedItem) {
    return items;
  }

  const remainingItems = items.filter((item) => item.id !== itemId);
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index <= remainingItems.length; index += 1) {
    const candidateItems = normalizeWidgetOrder([
      ...remainingItems.slice(0, index),
      draggedItem,
      ...remainingItems.slice(index),
    ]);
    const candidatePackedItem = packWidgetItems(candidateItems).find((item) => item.id === itemId);

    if (!candidatePackedItem) {
      continue;
    }

    const center = getPackedItemCenter(candidatePackedItem, containerWidth);
    const distance = Math.hypot(point.x - center.x, point.y - center.y);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }

  return normalizeWidgetOrder([
    ...remainingItems.slice(0, bestIndex),
    draggedItem,
    ...remainingItems.slice(bestIndex),
  ]);
}
