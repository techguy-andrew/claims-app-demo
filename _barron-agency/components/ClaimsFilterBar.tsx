'use client'

import * as React from "react"
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { SearchInput } from "./SearchInput"
import { StatusFilterDropdown } from "./StatusFilterDropdown"
import { Button } from "./Button"
import type { ClaimStatus } from "@prisma/client"

// Inline utility for merging Tailwind classes - makes component portable
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface ClaimsFilterBarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  selectedStatuses: ClaimStatus[]
  onStatusChange: (statuses: ClaimStatus[]) => void
  onClearAll?: () => void
  activeFilterCount?: number
  className?: string
}

export function ClaimsFilterBar({
  searchQuery,
  onSearchChange,
  selectedStatuses,
  onStatusChange,
  onClearAll,
  activeFilterCount = 0,
  className,
}: ClaimsFilterBarProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row gap-3", className)}>
      {/* Search - takes more space */}
      <div className="flex-1 min-w-0 sm:max-w-xs">
        <SearchInput
          placeholder="Search claims..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onClear={() => onSearchChange('')}
        />
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Status filter - multi-select dropdown */}
        <StatusFilterDropdown
          selectedStatuses={selectedStatuses}
          onStatusChange={onStatusChange}
        />

        {/* Clear all button - show only when filters active */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-muted-foreground"
          >
            Clear ({activeFilterCount})
          </Button>
        )}
      </div>
    </div>
  )
}
