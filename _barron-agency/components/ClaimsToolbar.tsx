'use client'

import * as React from "react"
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { PageHeader } from "./PageHeader"
import { ClaimsFilterBar, type ClaimsFilterBarProps } from "./ClaimsFilterBar"

// Inline utility for merging Tailwind classes - makes component portable
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface ClaimsToolbarProps extends ClaimsFilterBarProps {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function ClaimsToolbar({
  title,
  description,
  action,
  className,
  // Filter props
  searchQuery,
  onSearchChange,
  selectedStatuses,
  onStatusChange,
  onClearAll,
  activeFilterCount,
}: ClaimsToolbarProps) {
  return (
    <div
      className={cn(
        "sticky top-16 z-40",
        "bg-background border-b",
        "px-8 py-6 space-y-4",
        className
      )}
    >
      <PageHeader
        title={title}
        description={description}
        action={action}
      />
      <ClaimsFilterBar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        selectedStatuses={selectedStatuses}
        onStatusChange={onStatusChange}
        onClearAll={onClearAll}
        activeFilterCount={activeFilterCount}
      />
    </div>
  )
}
