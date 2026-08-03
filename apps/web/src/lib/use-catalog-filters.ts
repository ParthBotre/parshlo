'use client';

import { useMemo, useState } from 'react';

/**
 * Minimum shape required to drive the catalog filter UI:
 * a category bucket and the two text fields we search across.
 */
export interface Filterable {
  category: string;
  name: string;
  composition: string;
}

export interface CatalogFiltersState<T extends Filterable> {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategories: Set<string>;
  toggleCategory: (category: string) => void;
  clearFilters: () => void;
  /** All unique categories present in `products`, sorted A-Z. */
  categories: string[];
  /** `products` filtered by current search query and selected categories. */
  filteredProducts: T[];
  /** True if either the search query is non-empty or any category is selected. */
  isFiltered: boolean;
}

/**
 * Drives the catalog search-bar + category-chips experience on every catalog
 * page (public, buyer, admin) without re-implementing the filtering rules.
 *
 * Multi-select category chips behave like a union ("show me bone-joint OR
 * nutraceuticals"). Search query matches `name` OR `composition`,
 * case-insensitive.
 */
export function useCatalogFilters<T extends Filterable>(products: T[]): CatalogFiltersState<T> {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      set.add(p.category);
    }
    return Array.from(set).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (selectedCategories.size > 0 && !selectedCategories.has(p.category)) {
        return false;
      }
      if (q.length > 0) {
        const hay = `${p.name} ${p.composition}`.toLowerCase();
        if (!hay.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [products, searchQuery, selectedCategories]);

  const toggleCategory = (cat: string): void => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const clearFilters = (): void => {
    setSearchQuery('');
    setSelectedCategories(new Set());
  };

  const isFiltered = searchQuery.length > 0 || selectedCategories.size > 0;

  return {
    searchQuery,
    setSearchQuery,
    selectedCategories,
    toggleCategory,
    clearFilters,
    categories,
    filteredProducts,
    isFiltered,
  };
}
