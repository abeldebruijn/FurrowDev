import type { WidgetProps } from "@/lib/widgets/types";

export default function VisionsWidget({ width: _width, height: _height }: WidgetProps) {
  return (
    <div className="border h-full p-2 rounded bg-red-100">
      <p>Visions widget</p>
    </div>
  );
}
