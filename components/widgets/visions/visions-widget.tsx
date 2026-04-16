"use client";

import { CreateVisionDialog } from "../../vision/create-vision-dialog";
import type { WidgetProps } from "../../../lib/widgets/types";

import {
  VisionWidgetActionButton,
  VisionWidgetCard,
  VisionWidgetFooterLink,
} from "./visions-widget-shared";

export default function VisionsWidget({ width, height, project }: WidgetProps) {
  return (
    <VisionWidgetCard
      height={height}
      renderHeaderAction={() => (
        <CreateVisionDialog projectId={project.projectId} roadmapItems={project.roadmapItems} />
      )}
      renderAction={(vision) => (
        <VisionWidgetActionButton
          href={`/project/${project.projectId}/ideas/vision/${vision.id}`}
        />
      )}
      renderFooter={() => <VisionWidgetFooterLink href={`/project/${project.projectId}/ideas`} />}
      visions={project.visions}
      width={width}
    />
  );
}
