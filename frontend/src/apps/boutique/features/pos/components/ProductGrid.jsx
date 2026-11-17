import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getProductGridColumns,
  getProductGridWindow,
  PRODUCT_GRID_ROW_HEIGHT,
  VIRTUAL_PRODUCT_THRESHOLD,
} from "../services/productGrid.js";
import { usePosCart } from "../store/cartStore.js";

const moneyFormatter = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 0,
});

const ProductCard = memo(function ProductCard({ product, onAdd }) {
  const lowStock = product.stock <= 10;

  return (
    <button
      type="button"
      onClick={() => onAdd(product)}
      className="flex h-full min-h-[150px] flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md"
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-200 text-lg">
        📦
      </div>
      <div>
        <h3 className="text-base font-medium text-slate-800">{product.name}</h3>
        <p className="mt-2 text-xl font-bold text-blue-600">
          {moneyFormatter.format(product.price)} CDF
        </p>
        <p className={`mt-1 text-xs ${lowStock ? "text-amber-600" : "text-slate-500"}`}>
          Stock: {product.stock} {product.unit}
        </p>
      </div>
    </button>
  );
});

function getViewportWidth() {
  return typeof window === "undefined" ? 1280 : window.innerWidth;
}

function getViewportHeight() {
  return typeof window === "undefined"
    ? 600
    : Math.floor(window.innerHeight * 0.7);
}

const ProductGrid = memo(function ProductGrid({ products }) {
  const containerRef = useRef(null);
  const isVirtualized = products.length > VIRTUAL_PRODUCT_THRESHOLD;
  const [columns, setColumns] = useState(() =>
    getProductGridColumns(getViewportWidth()),
  );
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(getViewportHeight);
  const onAdd = useCallback((product) => {
    usePosCart.getState().addItem(product);
  }, []);

  const windowedProducts = useMemo(
    () =>
      getProductGridWindow({
        itemCount: products.length,
        columns,
        scrollTop,
        viewportHeight,
      }),
    [products.length, columns, scrollTop, viewportHeight],
  );

  useEffect(() => {
    if (!isVirtualized) return undefined;

    const updateLayout = () => {
      setColumns(getProductGridColumns(getViewportWidth()));
      if (containerRef.current) {
        setViewportHeight(containerRef.current.clientHeight || 600);
      }
    };

    window.addEventListener("resize", updateLayout);

    let resizeObserver;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      resizeObserver = new ResizeObserver(updateLayout);
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener("resize", updateLayout);
      resizeObserver?.disconnect();
    };
  }, [isVirtualized]);

  if (!isVirtualized) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} onAdd={onAdd} product={product} />
        ))}
      </div>
    );
  }

  const visibleProducts = products.slice(
    windowedProducts.startIndex,
    windowedProducts.endIndex,
  );
  const rows = [];

  for (let index = 0; index < visibleProducts.length; index += columns) {
    rows.push(visibleProducts.slice(index, index + columns));
  }

  return (
    <div
      ref={containerRef}
      className="max-h-[70vh] overflow-y-auto overscroll-contain"
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      aria-label="Catalogue des produits"
    >
      <div className="flex flex-col">
        <div aria-hidden="true" style={{ height: windowedProducts.topPadding }} />
        {rows.map((row, rowIndex) => (
          <div
            key={row[0].id}
            className="grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              height: PRODUCT_GRID_ROW_HEIGHT,
              paddingBottom: 12,
            }}
          >
            {row.map((product) => (
              <ProductCard key={product.id} onAdd={onAdd} product={product} />
            ))}
            {row.length < columns &&
              Array.from({ length: columns - row.length }, (_, index) => (
                <div key={`empty-${rowIndex}-${index}`} aria-hidden="true" />
              ))}
          </div>
        ))}
        <div aria-hidden="true" style={{ height: windowedProducts.bottomPadding }} />
      </div>
    </div>
  );
});

export default ProductGrid;
