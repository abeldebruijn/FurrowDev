"use client";

import { useState } from "react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { widgetRegistry } from "@/components/widgets/registry";
import { cn } from "@/lib/utils";
import type { WidgetConfig } from "@/lib/widgets/types";

import { PreviewWidgetCard } from "./widget-card";

type WidgetPreviewSize = {
  type: "short" | "medium" | "tall";
  length: number;
};

export function AddWidgetPanel({ projectId }: { projectId: string }) {
  const [filterWidget, setFilterWidget] = useState("");

  const selectedWidget =
    filterWidget === ""
      ? null
      : (widgetRegistry.find((widget) => widget.options.name === filterWidget) ?? null);

  return (
    <div className="fixed inset-x-6 bottom-0 mx-auto grid h-1/2 max-h-128 max-w-6xl grid-cols-[200px_minmax(0,1fr)] overflow-hidden rounded-t-2xl border border-border bg-background shadow-2xl">
      <aside className="flex flex-col border-r border-border/70 bg-muted/30">
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
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
          <p className="text-sm font-medium text-muted-foreground">
            {filterWidget ? `${filterWidget} widgets` : "All widgets"}
          </p>

          <Link className={cn(buttonVariants({ size: "sm" }))} href={`/project/${projectId}`}>
            Gereed
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {selectedWidget ? (
            <Widgets widget={selectedWidget} />
          ) : (
            <AllWidgets widgets={widgetRegistry} />
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border/70 bg-muted/25 px-5 py-4">
          <p className="text-sm font-medium text-foreground">
            Sleep een widget om deze op het bureaublad te zetten...
          </p>
        </div>
      </section>
    </div>
  );
}

function AllWidgets({ widgets }: { widgets: WidgetConfig[] }) {
  return (
    <div className="grid grid-cols-2 items-center gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {widgets.flatMap((widget) =>
        getWidgetSizes(widget).map((size) => (
          <WidgetPreview key={`${widget.options.name}-${size.type}`} widget={widget} size={size} />
        )),
      )}
    </div>
  );
}

function Widgets({ widget }: { widget: WidgetConfig }) {
  const sizes = getWidgetSizes(widget);

  return (
    <div className="grid grid-cols-2 items-center gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {sizes.map((size) => (
        <WidgetPreview key={`${widget.options.name}-${size.type}`} widget={widget} size={size} />
      ))}
    </div>
  );
}

function WidgetPreview({ widget, size }: { widget: WidgetConfig; size: WidgetPreviewSize }) {
  const height = size.type === "tall" ? 3 : size.type === "medium" ? 2 : 1;

  return <PreviewWidgetCard size={size}>{widget.router({ width: 1, height })}</PreviewWidgetCard>;
}

function getWidgetSizes(widget: WidgetConfig): WidgetPreviewSize[] {
  const { size } = widget.options;

  return [
    { length: size.short, type: "short" as const },
    { length: size.medium, type: "medium" as const },
    { length: size.tall, type: "tall" as const },
  ].filter((entry): entry is WidgetPreviewSize => entry.length !== undefined);
}
