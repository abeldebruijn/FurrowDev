import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WidgetProps } from "@/lib/widgets/types";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";

export default function RoadmapWidgetPreview({ project }: WidgetProps) {
  return (
    <section className="flex h-full min-h-0 flex-col bg-background p-1">
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
          <p className="mr-1 text-[11px] text-muted-foreground">1 / 12</p>
          <Button
            aria-label="Previous roadmap item"
            className="size-7 rounded-full"
            disabled={true}
            size="icon"
            type="button"
            variant="outline"
          >
            <ArrowLeftIcon className="size-3.5" />
          </Button>
          <Button
            aria-label="Next roadmap item"
            className="size-7 rounded-full"
            disabled={true}
            size="icon"
            type="button"
            variant="outline"
          >
            <ArrowRightIcon className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="mt-2 flex min-h-0 flex-1 flex-col rounded-lg border border-border/60 bg-muted/20 p-3 relative">
        <div className="flex items-center gap-2 absolute top-2 right-2">
          <p className="font-mono text-[11px] font-semibold tracking-tight text-muted-foreground">
            {0.1}
          </p>
        </div>

        <p className="line-clamp-2 text-sm font-medium text-foreground">
          Setup linting and formatting
        </p>

        <p className="line-clamp-3 text-xs font-medium text-muted-foreground">
          Add ESLint with a sensible JS config, configure Vite build output for production, and
          verify a clean npm run build produces a deployable dist/ folder.
        </p>
      </div>

      <div
        className={cn(
          buttonVariants({ size: "sm", variant: "ghost" }),
          "mt-1 h-8 justify-between px-2 text-xs",
        )}
      >
        View roadmap
        <ArrowRightIcon className="size-3.5" />
      </div>
    </section>
  );
}
