'use client'

import * as React from "react"
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Input, type InputProps } from "./Input"
import { SearchIcon } from "../icons/SearchIcon"
import { CloseIcon } from "../icons/CloseIcon"

// Inline utility for merging Tailwind classes - makes component portable
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface SearchInputProps extends Omit<InputProps, 'type'> {
  onClear?: () => void
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onChange, onClear, className, ...props }, ref) => {
    const hasValue = Boolean(value)

    const handleClear = () => {
      onClear?.()
    }

    return (
      <div className="relative">
        <SearchIcon
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <Input
          ref={ref}
          type="text"
          className={cn("pl-9 pr-9", className)}
          value={value}
          onChange={onChange}
          {...props}
        />
        {hasValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <CloseIcon size={16} />
          </button>
        )}
      </div>
    )
  }
)
SearchInput.displayName = "SearchInput"

export { SearchInput }
