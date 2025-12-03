'use client'

import * as React from "react"
import Link from 'next/link'
import { motion } from "framer-motion"
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { BRAND } from '@/_barron-agency/config/navigation'
import { ChevronLeftIcon } from '@/_barron-agency/icons/ChevronLeftIcon'

// Inline utility for merging Tailwind classes - makes component portable
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface TopBarProps extends React.HTMLAttributes<HTMLElement> {
  /** Content to render in the center slot */
  children?: React.ReactNode
  /** Content to render in the right actions slot */
  actions?: React.ReactNode
  /** Callback when sidebar toggle is clicked (both mobile and desktop) */
  onSidebarToggle?: () => void
  /** Whether the sidebar is currently collapsed/hidden */
  sidebarCollapsed?: boolean
  /** Whether this is mobile view (controls which icon to show) */
  isMobile?: boolean
  /** Whether to disable the brand link (for public pages) */
  disableBrandLink?: boolean
}

export function TopBar({
  children,
  actions,
  onSidebarToggle,
  sidebarCollapsed = false,
  isMobile = false,
  disableBrandLink = false,
  className,
  ...props
}: TopBarProps) {
  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50',
        'bg-background border-b',
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        {/* Left section: Toggle + Brand */}
        <div className="flex items-center gap-2">
          {/* Sidebar toggle (works for both mobile and desktop) */}
          {onSidebarToggle && (
            <button
              onClick={onSidebarToggle}
              className={cn(
                'p-2 rounded-md',
                'text-muted-foreground hover:text-foreground',
                'hover:bg-accent transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              )}
              aria-label={sidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
            >
              <motion.div
                initial={false}
                animate={{ rotate: sidebarCollapsed ? 180 : 0 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                <ChevronLeftIcon size={20} />
              </motion.div>
            </button>
          )}

          {/* Brand */}
          {disableBrandLink ? (
            <span
              className={cn(
                'font-semibold text-lg',
                'ml-2'
              )}
            >
              {BRAND.name}
            </span>
          ) : (
            <Link
              href={BRAND.href}
              className={cn(
                'font-semibold text-lg',
                'hover:opacity-80 transition-opacity',
                'ml-2'
              )}
              aria-label={`${BRAND.name} - ${BRAND.description}`}
            >
              {BRAND.name}
            </Link>
          )}
        </div>

        {/* Center content slot */}
        {children && (
          <div className="hidden md:flex flex-1 max-w-2xl mx-8">
            {children}
          </div>
        )}

        {/* Right actions slot */}
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </header>
  )
}
