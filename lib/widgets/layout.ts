import type {
  PackedWidgetItem,
  TemporaryWidgetItem,
  WidgetConfig,
  WidgetSizeType,
  WidgetSizeVariant,
} from "@/lib/widgets/types";

export const WIDGET_LAYOUT_COLUMNS = 3;
export const WIDGET_GRID_GAP_PX = 16;
export const WIDGET_GRID_ROW_HEIGHT_PX = 96;

const WIDGET_SIZE_HEIGHTS: Record<WidgetSizeType, number> = {
  short: 1,
  medium: 2,
  tall: 3,
};

export function getWidgetSizeVariants(widget: WidgetConfig): WidgetSizeVariant[] {
  return (Object.entries(widget.options.size) as [WidgetSizeType, number | undefined][])
    .flatMap(([type, maxWidth]) => {
      if (!maxWidth) {
        return [];
      }

      return Array.from({ length: maxWidth }, (_, index) => {
        const width = index + 1;
        const height = WIDGET_SIZE_HEIGHTS[type];

        return {
          height,
          key: `${widget.options.name}-${width}x${height}`,
          label: `${width}x${height}`,
          type,
          width,
          widgetName: widget.options.name,
        };
      });
    })
    .sort((left, right) => left.height - right.height || left.width - right.width);
}

export function createTemporaryWidgetItem(
  variant: Pick<WidgetSizeVariant, "height" | "widgetName" | "width">,
  order: number,
): TemporaryWidgetItem {
  return {
    height: variant.height,
    id: globalThis.crypto?.randomUUID?.() ?? `${variant.widgetName}-${order}-${Date.now()}`,
    order,
    widgetName: variant.widgetName,
    width: variant.width,
  };
}

export function getInitialTemporaryWidgetItems(
  layout:
    | {
        largeLayout: {
          hSize: number;
          widgetName: string;
          wSize: number;
          xPos: number;
          yPos: number;
        }[];
      }
    | null
    | undefined,
): TemporaryWidgetItem[] {
  if (!layout) {
    return [];
  }

  return [...layout.largeLayout]
    .sort((left, right) => left.yPos - right.yPos || left.xPos - right.xPos)
    .map((item, index) => ({
      height: item.hSize,
      id: `persisted-${index}-${item.widgetName}`,
      order: index,
      widgetName: item.widgetName,
      width: item.wSize,
    }));
}

export function packWidgetItems(
  items: TemporaryWidgetItem[],
  columns = WIDGET_LAYOUT_COLUMNS,
): PackedWidgetItem[] {
  if (!Number.isInteger(columns) || columns <= 0) {
    throw new Error(`Invalid widget layout column count: ${columns}`);
  }

  const occupancy: boolean[][] = [];

  return items.map((item) => {
    if (!Number.isInteger(item.width) || item.width <= 0) {
      throw new Error(`Invalid widget width for "${item.widgetName}" (${item.id}): ${item.width}`);
    }

    if (!Number.isInteger(item.height) || item.height <= 0) {
      throw new Error(
        `Invalid widget height for "${item.widgetName}" (${item.id}): ${item.height}`,
      );
    }

    const width = Math.min(item.width, columns);
    let yPos = 0;

    while (true) {
      for (let xPos = 0; xPos <= columns - width; xPos += 1) {
        if (!canPlace(occupancy, xPos, yPos, width, item.height, columns)) {
          continue;
        }

        occupy(occupancy, xPos, yPos, width, item.height, columns);

        return {
          ...item,
          width,
          xPos,
          yPos,
        };
      }

      yPos += 1;
    }
  });
}

export function normalizeWidgetOrder(items: TemporaryWidgetItem[]): TemporaryWidgetItem[] {
  return items.map((item, index) => ({
    ...item,
    order: index,
  }));
}

export function getPackedItemCenter(
  item: Pick<PackedWidgetItem, "height" | "width" | "xPos" | "yPos">,
  containerWidth: number,
) {
  const columnWidth =
    (containerWidth - WIDGET_GRID_GAP_PX * (WIDGET_LAYOUT_COLUMNS - 1)) / WIDGET_LAYOUT_COLUMNS;
  const stepX = columnWidth + WIDGET_GRID_GAP_PX;
  const stepY = WIDGET_GRID_ROW_HEIGHT_PX + WIDGET_GRID_GAP_PX;
  const widthPx = columnWidth * item.width + WIDGET_GRID_GAP_PX * (item.width - 1);
  const heightPx = WIDGET_GRID_ROW_HEIGHT_PX * item.height + WIDGET_GRID_GAP_PX * (item.height - 1);

  return {
    x: item.xPos * stepX + widthPx / 2,
    y: item.yPos * stepY + heightPx / 2,
  };
}

function canPlace(
  occupancy: boolean[][],
  xPos: number,
  yPos: number,
  width: number,
  height: number,
  columns: number,
) {
  if (xPos + width > columns) {
    return false;
  }

  for (let y = yPos; y < yPos + height; y += 1) {
    for (let x = xPos; x < xPos + width; x += 1) {
      if (occupancy[y]?.[x]) {
        return false;
      }
    }
  }

  return true;
}

function occupy(
  occupancy: boolean[][],
  xPos: number,
  yPos: number,
  width: number,
  height: number,
  columns: number,
) {
  for (let y = yPos; y < yPos + height; y += 1) {
    occupancy[y] ??= Array.from({ length: columns }, () => false);

    for (let x = xPos; x < xPos + width; x += 1) {
      occupancy[y][x] = true;
    }
  }
}
