'use client'

import * as React from "react"
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { motion, AnimatePresence } from "framer-motion"
import { TopBar } from '@/_barron-agency/components/TopBar'
import { Sidebar } from '@/_barron-agency/components/Sidebar'

// Inline utility for merging Tailwind classes - makes component portable
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Custom hook for localStorage-persisted state
function useLocalStorageState<T>(
  key: string,
  defaultValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = React.useState<T>(defaultValue)
  const [isHydrated, setIsHydrated] = React.useState(false)

  // Load from localStorage on mount
  React.useEffect(() => {
    const stored = localStorage.getItem(key)
    if (stored !== null) {
      try {
        setState(JSON.parse(stored))
      } catch {
        // If parsing fails, use default
      }
    }
    setIsHydrated(true)
  }, [key])

  // Save to localStorage on change
  React.useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(key, JSON.stringify(state))
    }
  }, [key, state, isHydrated])

  return [state, setState]
}

// Custom hook to detect mobile viewport
function useIsMobile(breakpoint: number = 768) {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint)
    }

    // Check on mount
    checkMobile()

    // Listen for resize
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [breakpoint])

  return isMobile
}

export interface AppLayoutProps {
  /** Page content */
  children: React.ReactNode
  /** Content for TopBar center slot */
  topBarCenter?: React.ReactNode
  /** Content for TopBar right actions slot */
  actions?: React.ReactNode
}

export function AppLayout({
  children,
  topBarCenter,
  actions,
}: AppLayoutProps) {
  const isMobile = useIsMobile()

  // Desktop: collapsed = icons only (persisted)
  const [desktopCollapsed, setDesktopCollapsed] = useLocalStorageState(
    'sidebar-collapsed',
    false
  )

  // Mobile: hidden = completely hidden (not persisted, starts hidden)
  const [mobileHidden, setMobileHidden] = React.useState(true)

  const handleSidebarToggle = () => {
    if (isMobile) {
      setMobileHidden((prev) => !prev)
    } else {
      setDesktopCollapsed((prev) => !prev)
    }
  }

  // Close mobile sidebar on navigation
  const handleLinkClick = () => {
    if (isMobile) {
      setMobileHidden(true)
    }
  }

  // Determine sidebar state based on viewport
  const sidebarCollapsed = isMobile ? false : desktopCollapsed
  const sidebarHidden = isMobile ? mobileHidden : false
  const isCollapsedOrHidden = isMobile ? mobileHidden : desktopCollapsed

  return (
    <div className="flex flex-col min-h-[100dvh] w-full">
      {/* TopBar - always visible */}
      <TopBar
        onSidebarToggle={handleSidebarToggle}
        sidebarCollapsed={isCollapsedOrHidden}
        actions={actions}
      >
        {topBarCenter}
      </TopBar>

      {/* Body: Sidebar + Main Content */}
      <div className="flex flex-1 pt-16">
        {/* Mobile: Backdrop + Overlay Sidebar */}
        {isMobile && (
          <AnimatePresence>
            {!mobileHidden && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="fixed inset-0 top-16 z-40 bg-black/50"
                  onClick={() => setMobileHidden(true)}
                  aria-hidden="true"
                />
                {/* Mobile Sidebar */}
                <Sidebar
                  isMobile
                  onLinkClick={handleLinkClick}
                />
              </>
            )}
          </AnimatePresence>
        )}

        {/* Desktop: Sidebar in normal flow */}
        {!isMobile && (
          <Sidebar
            collapsed={sidebarCollapsed}
            hidden={sidebarHidden}
            onLinkClick={handleLinkClick}
            className="h-[calc(100dvh-64px)] sticky top-16"
          />
        )}

        {/* Main Content */}
        <main className="flex-1 w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
