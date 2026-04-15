import { WidgetConfig } from "@/lib/widgets/types";
import downloadWidget from "./download/config";
import ideasWidget from "./ideas/config";
import installInstructionsWidget from "./install-instructions/config";
import roadmapWidget from "./roadmap/config";
import setupInstructionsWidget from "./setup-instructions/config";
import visionsWidget from "./visions/config";

export const widgetRegistry: WidgetConfig[] = [
  visionsWidget,
  roadmapWidget,
  installInstructionsWidget,
  setupInstructionsWidget,
  downloadWidget,
  ideasWidget,
];
