import type { WidgetProps, WidgetProjectVision } from "../../../lib/widgets/types";

import {
  VisionWidgetCard,
  VisionWidgetPreviewAction,
  VisionWidgetPreviewCreateButton,
  VisionWidgetPreviewFooter,
} from "./visions-widget-shared";

const previewVisions: WidgetProjectVision[] = [
  {
    collaborators: [],
    createdAt: "2026-04-14T08:00:00.000Z",
    id: "vision-preview-1",
    ownerName: "Abel",
    ownerUserId: "user-1",
    title: "Checkout rethink",
    updatedAt: "2026-04-15T15:20:00.000Z",
  },
  {
    collaborators: [
      {
        name: "Riley",
        userId: "user-2",
      },
    ],
    createdAt: "2026-04-14T09:00:00.000Z",
    id: "vision-preview-2",
    ownerName: "Abel",
    ownerUserId: "user-1",
    title: "Referral onboarding",
    updatedAt: "2026-04-15T14:10:00.000Z",
  },
  {
    collaborators: [
      {
        name: "Mina",
        userId: "user-3",
      },
      {
        name: "Riley",
        userId: "user-2",
      },
    ],
    createdAt: "2026-04-14T10:00:00.000Z",
    id: "vision-preview-3",
    ownerName: "Abel",
    ownerUserId: "user-1",
    title: "Analytics relaunch",
    updatedAt: "2026-04-15T13:00:00.000Z",
  },
  {
    collaborators: [],
    createdAt: "2026-04-14T11:00:00.000Z",
    id: "vision-preview-4",
    ownerName: "Abel",
    ownerUserId: "user-1",
    title: "Partner portal",
    updatedAt: "2026-04-15T11:45:00.000Z",
  },
  {
    collaborators: [
      {
        name: "Jules",
        userId: "user-4",
      },
    ],
    createdAt: "2026-04-14T12:00:00.000Z",
    id: "vision-preview-5",
    ownerName: "Abel",
    ownerUserId: "user-1",
    title: "Mobile capture flow",
    updatedAt: "2026-04-15T10:30:00.000Z",
  },
];

export default function VisionsWidgetPreview({ height, project: _project, width }: WidgetProps) {
  return (
    <VisionWidgetCard
      height={height}
      renderHeaderAction={() => <VisionWidgetPreviewCreateButton />}
      renderAction={() => <VisionWidgetPreviewAction />}
      renderFooter={() => <VisionWidgetPreviewFooter />}
      visions={previewVisions}
      width={width}
    />
  );
}
