import assert from "node:assert/strict";
import test from "node:test";
import {
  getProductGridColumns,
  getProductGridWindow,
  PRODUCT_GRID_ROW_HEIGHT,
  VIRTUAL_PRODUCT_THRESHOLD,
} from "../src/apps/boutique/features/pos/services/productGrid.js";

test("POS product grid keeps the existing responsive column counts", () => {
  assert.equal(getProductGridColumns(390), 1);
  assert.equal(getProductGridColumns(800), 2);
  assert.equal(getProductGridColumns(1440), 3);
});

test("product lists at or below the threshold remain fully rendered", () => {
  const result = getProductGridWindow({
    itemCount: VIRTUAL_PRODUCT_THRESHOLD,
    columns: 3,
    viewportHeight: 600,
  });

  assert.equal(result.virtualized, false);
  assert.equal(result.startIndex, 0);
  assert.equal(result.endIndex, VIRTUAL_PRODUCT_THRESHOLD);
  assert.equal(result.topPadding, 0);
  assert.equal(result.bottomPadding, 0);
});

test("1000 products are windowed while scrolling without skipping catalog entries", () => {
  const itemCount = 1000;
  const columns = 3;
  const viewportHeight = 600;
  const totalRows = Math.ceil(itemCount / columns);
  const visited = new Set();
  let maxRendered = 0;

  for (
    let scrollTop = 0;
    scrollTop <= totalRows * PRODUCT_GRID_ROW_HEIGHT;
    scrollTop += PRODUCT_GRID_ROW_HEIGHT * 3
  ) {
    const window = getProductGridWindow({
      itemCount,
      columns,
      scrollTop,
      viewportHeight,
    });

    assert.equal(window.virtualized, true);
    maxRendered = Math.max(maxRendered, window.endIndex - window.startIndex);

    for (let index = window.startIndex; index < window.endIndex; index += 1) {
      visited.add(index);
    }
  }

  assert.ok(maxRendered <= 24, `expected at most 24 mounted products, got ${maxRendered}`);
  assert.equal(visited.size, itemCount);
});

test("virtual grid clamps its spacers at the final catalog row", () => {
  const itemCount = 1000;
  const columns = 3;
  const totalRows = Math.ceil(itemCount / columns);
  const result = getProductGridWindow({
    itemCount,
    columns,
    scrollTop: Number.MAX_SAFE_INTEGER,
    viewportHeight: 600,
  });

  assert.ok(result.startIndex < itemCount);
  assert.equal(result.endIndex, 1000);
  assert.ok(result.topPadding <= totalRows * PRODUCT_GRID_ROW_HEIGHT);
  assert.equal(result.bottomPadding, 0);
});

test("virtual grid remains populated when filtering reduces the catalog", () => {
  const result = getProductGridWindow({
    itemCount: 240,
    columns: 3,
    scrollTop: Number.MAX_SAFE_INTEGER,
    viewportHeight: 600,
  });

  assert.equal(result.endIndex, 240);
  assert.ok(result.startIndex < result.endIndex);
  assert.ok(result.bottomPadding >= 0);
});
