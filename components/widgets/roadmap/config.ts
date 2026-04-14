import { WidgetConfig } from "@/lib/widgets/types";

import RoadmapWidget from "./roadmap-widget";

export default new WidgetConfig(RoadmapWidget)
  .name("Roadmap")
  .description("Roadmap widgets for the project workspace.")
  .size({
    medium: 2,
  });
