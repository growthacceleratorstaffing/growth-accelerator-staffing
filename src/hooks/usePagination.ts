import { useMemo } from 'react';

export const usePagination = <T>(
  items: T[],
  itemsPerPage: number,
  currentPage: number
) => {
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  }, [items, itemsPerPage, currentPage]);

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  return {
    paginatedItems,
    totalPages,
    hasNextPage,
    hasPreviousPage,
  };
};