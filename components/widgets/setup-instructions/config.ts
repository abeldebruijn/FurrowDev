import { WidgetConfig } from "@/lib/widgets/types";

import SetupInstructionsWidget from "./setup-instructions-widget";

export default new WidgetConfig(SetupInstructionsWidget)
  .name("Setup instructions")
  .description("Setup guidance widgets for the project workspace.")
  .size({
    short: 1,
    medium: 2,
  });
