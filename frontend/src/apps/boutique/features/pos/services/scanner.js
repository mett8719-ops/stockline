export function normalizeBarcode(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();
}

export function supportsCameraScanning() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  return Boolean(
    "BarcodeDetector" in window ||
      (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function"),
  );
}

export function findProductByBarcode(products, value) {
  const normalized = normalizeBarcode(value);

  if (!Array.isArray(products) || normalized.length === 0) {
    return undefined;
  }

  return products.find((product) => {
    const candidateCode = normalizeBarcode(
      product?.barcode ?? product?.code ?? product?.sku ?? product?.id,
    );

    return candidateCode === normalized;
  });
}
