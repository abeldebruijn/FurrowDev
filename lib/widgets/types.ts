import { JSX, ReactNode } from "react";

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

export class WidgetConfig {
  #name: string = "";
  #description: string = "";
  #size: {
    tall?: number;
    medium?: number;
    short?: number;
  } = {};
  #router: ({ width, height }: WidgetProps) => ReactNode;

  constructor(defaultWidget: ({ width, height }: WidgetProps) => JSX.Element) {
    this.#router = defaultWidget;
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

  setRouter(router: ({ width, height }: WidgetProps) => JSX.Element) {
    this.#router = router;
    return this;
  }
}

export type WidgetProps = {
  width: number;
  height: number;
};
