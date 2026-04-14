import { cn } from "@/lib/utils";

export function PreviewWidgetCard({
  size,
  children,
}: {
  size: { type: "short" | "medium" | "tall"; length: number };
  children: React.ReactNode;
}) {
  const sizeClasses = {
    short: "h-12",
    medium: "h-28",
    tall: "h-40",
  };

  const sizeHeight = {
    short: 1,
    medium: 2,
    tall: 3,
  };

  const sizeClass = sizeClasses[size.type];
  const height = sizeHeight[size.type];

  return (
    <div className={cn("gap-0 rounded-xl border border-border/80 bg-background h-fit")}>
      <div className={cn("px-2 py-3", sizeClass)}>{children}</div>

      <div className="px-2 py-1 border-t font-sans text-muted-foreground flex justify-between items-center">
        <p className="text-sm">{size.type}</p>
        <p className="text-xs">
          Sizes: {Array.from({ length: size.length }, (_, i) => `${i + 1}x${height}`).join(", ")}
        </p>
      </div>
    </div>
  );
}
