import { WidgetConfig } from "@/lib/widgets/types";

import InstallInstructionsWidget from "./install-instructions-widget";

export default new WidgetConfig(InstallInstructionsWidget)
  .name("Install instructions")
  .description("Installation guidance widgets for the project workspace.")
  .size({
    short: 1,
    medium: 2,
  });
