'use client'

import * as React from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { ClaimStatusBadge, type ClaimStatus } from "./ClaimStatusBadge"
import { CheckIcon } from "../icons/CheckIcon"
import { CloseIcon } from "../icons/CloseIcon"

// Inline utility for merging Tailwind classes - makes component portable
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Chevron icon for trigger
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-4 w-4", className)}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

const STATUS_OPTIONS: { value: ClaimStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CLOSED', label: 'Closed' },
]

export interface StatusFilterDropdownProps {
  selectedStatuses: ClaimStatus[]
  onStatusChange: (statuses: ClaimStatus[]) => void
  className?: string
}

export function StatusFilterDropdown({
  selectedStatuses,
  onStatusChange,
  className,
}: StatusFilterDropdownProps) {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [position, setPosition] = React.useState({ top: 0, left: 0 })
  const [mounted, setMounted] = React.useState(false)

  const hasSelections = selectedStatuses.length > 0

  const handleToggleStatus = (status: ClaimStatus) => {
    if (selectedStatuses.includes(status)) {
      onStatusChange(selectedStatuses.filter((s) => s !== status))
    } else {
      onStatusChange([...selectedStatuses, status])
    }
    setOpen(false)
  }

  const handleClear = () => {
    onStatusChange([])
    setOpen(false)
  }

  // Calculate position based on trigger element
  React.useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const contentWidth = contentRef.current?.offsetWidth || 180

      let left = rect.left

      // Keep within viewport
      const maxLeft = window.innerWidth - contentWidth - 8
      left = Math.max(8, Math.min(left, maxLeft))

      setPosition({
        top: rect.bottom + 4,
        left,
      })
    }
  }, [open])

  // Handle click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    const handleScroll = () => {
      setOpen(false)
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("keydown", handleKeyDown)
      window.addEventListener("scroll", handleScroll, true)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("scroll", handleScroll, true)
    }
  }, [open])

  // Handle mounting for portal
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Render trigger content based on selections
  const renderTriggerContent = () => {
    if (!hasSelections) {
      return <span className="text-muted-foreground">Status</span>
    }

    if (selectedStatuses.length === 1) {
      return <ClaimStatusBadge status={selectedStatuses[0]} />
    }

    return (
      <span className="text-sm">
        {selectedStatuses.length} statuses
      </span>
    )
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-10 items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "min-w-[140px]",
          className
        )}
      >
        {renderTriggerContent()}
        <ChevronDownIcon className="opacity-50" />
      </button>

      {mounted && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={contentRef}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.1, ease: "easeOut" }}
              className="z-50 min-w-[180px] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
              style={{
                position: "fixed",
                top: position.top,
                left: position.left,
              }}
            >
              {/* Clear option at top - always visible, disabled when no selections */}
              <button
                type="button"
                onClick={handleClear}
                disabled={!hasSelections}
                className={cn(
                  "relative flex w-full select-none items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none transition-colors",
                  hasSelections
                    ? "cursor-pointer hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                    : "cursor-not-allowed opacity-50 text-muted-foreground"
                )}
              >
                <CloseIcon size={16} className="opacity-70" />
                <span>Clear selection</span>
              </button>
              <div className="-mx-1 my-1 h-px bg-muted" />

              {/* Status options */}
              {STATUS_OPTIONS.map((option) => {
                const isSelected = selectedStatuses.includes(option.value)
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleToggleStatus(option.value)}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-accent/50"
                    )}
                  >
                    <span className="w-4 flex items-center justify-center">
                      {isSelected && <CheckIcon className="h-4 w-4 text-foreground" />}
                    </span>
                    <ClaimStatusBadge status={option.value} />
                  </button>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
