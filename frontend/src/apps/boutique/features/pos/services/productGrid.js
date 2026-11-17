export const VIRTUAL_PRODUCT_THRESHOLD = 200;
export const PRODUCT_GRID_ROW_HEIGHT = 162;

export function getProductGridColumns(viewportWidth) {
  if (viewportWidth >= 1280) return 3;
  if (viewportWidth >= 640) return 2;
  return 1;
}

export function getProductGridWindow({
  itemCount,
  columns,
  scrollTop = 0,
  viewportHeight = 600,
  overscan = 2,
  threshold = VIRTUAL_PRODUCT_THRESHOLD,
  rowHeight = PRODUCT_GRID_ROW_HEIGHT,
}) {
  const count = Math.max(0, Math.floor(itemCount));
  const columnCount = Math.max(1, Math.floor(columns));
  const totalRows = Math.ceil(count / columnCount);

  if (count <= threshold) {
    return {
      startRow: 0,
      endRow: totalRows,
      startIndex: 0,
      endIndex: count,
      topPadding: 0,
      bottomPadding: 0,
      virtualized: false,
    };
  }

  const firstVisibleRow = Math.min(
    Math.floor(Math.max(0, scrollTop) / rowHeight),
    Math.max(0, totalRows - 1),
  );
  const visibleRows = Math.max(1, Math.ceil(Math.max(0, viewportHeight) / rowHeight));
  const startRow = Math.max(0, firstVisibleRow - overscan);
  const endRow = Math.min(totalRows, firstVisibleRow + visibleRows + overscan);

  return {
    startRow,
    endRow,
    startIndex: startRow * columnCount,
    endIndex: Math.min(count, endRow * columnCount),
    topPadding: startRow * rowHeight,
    bottomPadding: (totalRows - endRow) * rowHeight,
    virtualized: true,
  };
}
