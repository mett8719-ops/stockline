import assert from "node:assert/strict";
import test from "node:test";
import {
  findProductByBarcode,
  normalizeBarcode,
  supportsCameraScanning,
} from "../src/apps/boutique/features/pos/services/scanner.js";

const products = [
  { id: "p-1", barcode: "1111111111111", name: "Riz local 25kg" },
  { id: "p-2", barcode: "2222222222222", name: "Huile palma 5L" },
];

test("barcode helpers normalize and match product codes", () => {
  assert.equal(normalizeBarcode(" 1111 1111 1111 1 "), "1111111111111");
  assert.deepEqual(findProductByBarcode(products, "2222 2222 2222 2"), products[1]);
  assert.equal(findProductByBarcode(products, "unknown"), undefined);
});

test("camera scanning is guarded for non-browser runtimes", () => {
  assert.equal(supportsCameraScanning(), false);
});
