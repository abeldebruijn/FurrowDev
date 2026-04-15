import { JSX, ReactNode } from "react";

import type { ProjectRoadmap, ProjectRoadmapItem } from "@/lib/project/server";

export type WidgetSizeType = "short" | "medium" | "tall";

export type WidgetSizeVariant = {
  height: number;
  key: string;
  label: string;
  type: WidgetSizeType;
  width: number;
  widgetName: string;
};

export type TemporaryWidgetItem = {
  height: number;
  id: string;
  order: number;
  widgetName: string;
  width: number;
};

export type PackedWidgetItem = TemporaryWidgetItem & {
  xPos: number;
  yPos: number;
};

export type WidgetProjectContext = {
  projectId: string;
  roadmap: ProjectRoadmap;
  roadmapItems: ProjectRoadmapItem[];
};

export class WidgetConfig {
  #name: string = "";
  #description: string = "";
  #size: {
    tall?: number;
    medium?: number;
    short?: number;
  } = {};
  #router: ({ width, height, project }: WidgetProps) => ReactNode;
  #preview: ({ width, height, project }: WidgetProps) => ReactNode;

  constructor(defaultWidget: ({ width, height, project }: WidgetProps) => JSX.Element) {
    this.#router = defaultWidget;
    this.#preview = defaultWidget;
  }

  name(name: string) {
    this.#name = name;
    return this;
  }

  description(description: string) {
    this.#description = description;
    return this;
  }

  size(size: { tall?: number; medium?: number; short?: number }) {
    this.#size = size;
    return this;
  }

  get options() {
    return {
      name: this.#name,
      description: this.#description,
      size: this.#size,
    };
  }

  get router() {
    return this.#router;
  }

  setRouter(router: ({ width, height, project }: WidgetProps) => JSX.Element) {
    this.#router = router;
    return this;
  }

  get preview() {
    return this.#preview;
  }

  setPreview(preview: ({ width, height, project }: WidgetProps) => JSX.Element) {
    this.#preview = preview;
    return this;
  }
}

export type WidgetProps = {
  width: number;
  height: number;
  project: WidgetProjectContext;
};
