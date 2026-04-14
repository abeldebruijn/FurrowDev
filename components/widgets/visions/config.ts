import { WidgetConfig } from "@/lib/widgets/types";

import VisionsWidget from "./visions-widget";

export default new WidgetConfig(VisionsWidget)
  .name("Visions")
  .description("Vision widgets for the project workspace.")
  .size({
    tall: 3,
    medium: 3,
  });
