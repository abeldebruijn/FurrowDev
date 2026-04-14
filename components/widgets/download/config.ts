import { WidgetConfig } from "@/lib/widgets/types";

import DownloadWidget from "./download-widget";

export default new WidgetConfig(DownloadWidget)
  .name("Download")
  .description("Download widgets for the project workspace.")
  .size({
    medium: 2,
    short: 2,
  });
