import { useCallback, useState } from "react";

function assertPositiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${name} doit être un entier positif.`);
  }
}

/**
 * Fournit l'état et les commandes d'une pagination par nombre total d'éléments.
 * @example const { page, pageSize, nextPage } = usePagination({ totalItems: 42 });
 */
export function usePagination({
  totalItems = 0,
  initialPage = 1,
  initialPageSize = 10,
} = {}) {
  if (!Number.isInteger(totalItems) || totalItems < 0) {
    throw new RangeError("Le nombre total d'éléments doit être un entier positif ou nul.");
  }

  assertPositiveInteger(initialPage, "La page initiale");
  assertPositiveInteger(initialPageSize, "La taille de page");

  const [pagination, setPagination] = useState({
    page: initialPage,
    pageSize: initialPageSize,
    totalItems,
  });

  if (pagination.totalItems !== totalItems) {
    const pageCount = Math.ceil(totalItems / pagination.pageSize);
    setPagination({
      ...pagination,
      page: Math.min(pagination.page, Math.max(pageCount, 1)),
      totalItems,
    });
  }

  const { page, pageSize } = pagination;
  const pageCount = Math.ceil(totalItems / pageSize);

  const setPage = useCallback(
    (nextPage) => {
      setPagination((current) => {
        const requestedPage = typeof nextPage === "function"
          ? nextPage(current.page)
          : nextPage;
        assertPositiveInteger(requestedPage, "La page");
        return {
          ...current,
          page: Math.min(
            requestedPage,
            Math.max(Math.ceil(totalItems / current.pageSize), 1),
          ),
        };
      });
    },
    [totalItems],
  );

  const setPageSize = useCallback((nextPageSize) => {
    assertPositiveInteger(nextPageSize, "La taille de page");
    setPagination((current) => ({
      ...current,
      page: 1,
      pageSize: nextPageSize,
    }));
  }, []);

  const nextPage = useCallback(() => {
    setPage(page + 1);
  }, [page, setPage]);

  const previousPage = useCallback(() => {
    setPage(Math.max(page - 1, 1));
  }, [page, setPage]);

  const reset = useCallback(() => {
    setPagination((current) => ({ ...current, page: 1 }));
  }, []);

  return {
    page,
    pageSize,
    pageCount,
    startIndex: totalItems === 0 ? 0 : (page - 1) * pageSize,
    endIndex: Math.min(page * pageSize, totalItems),
    setPage,
    setPageSize,
    nextPage,
    previousPage,
    reset,
  };
}
