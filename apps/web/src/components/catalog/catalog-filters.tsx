'use client';

import { Search, X } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface CatalogFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  categories: string[];
  selectedCategories: Set<string>;
  onToggleCategory: (category: string) => void;
  isFiltered: boolean;
  onClear: () => void;
  /** Override the placeholder text on the search input. */
  searchPlaceholder?: string;
}

/**
 * Catalog search box + category chip row. Pure controlled component — the
 * parent owns state (typically via `useCatalogFilters(products)`).
 */
export function CatalogFilters({
  searchQuery,
  onSearchChange,
  categories,
  selectedCategories,
  onToggleCategory,
  isFiltered,
  onClear,
  searchPlaceholder = 'Search by product name or composition…',
}: CatalogFiltersProps): JSX.Element {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
          aria-hidden
        />
        <input
          type="search"
          className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border py-2 pl-9 pr-9 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search products"
        />
        {searchQuery.length > 0 ? (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {categories.length > 1 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => {
            const isSelected = selectedCategories.has(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onToggleCategory(cat)}
                aria-pressed={isSelected}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-background text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                {cat}
              </button>
            );
          })}
          {isFiltered ? (
            <button
              type="button"
              onClick={onClear}
              className="text-muted-foreground hover:text-foreground px-2 text-xs underline-offset-2 hover:underline"
            >
              Clear
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
