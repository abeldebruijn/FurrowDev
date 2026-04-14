import { WidgetConfig } from "@/lib/widgets/types";

import IdeasWidget from "./ideas-widget";

export default new WidgetConfig(IdeasWidget)
  .name("Ideas")
  .description("Idea widgets for the project workspace.")
  .size({
    tall: 2,
  });
