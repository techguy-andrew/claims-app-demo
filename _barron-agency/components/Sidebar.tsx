'use client'

import * as React from "react"
import Link from 'next/link'
import { motion } from "framer-motion"
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { useNavigation } from '@/_barron-agency/config/navigation'
import { Button } from '@/_barron-agency/components/Button'

// Inline utility for merging Tailwind classes - makes component portable
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface SidebarProps {
  /** Whether the sidebar is collapsed (icons only on desktop) */
  collapsed?: boolean
  /** Whether the sidebar is fully hidden (mobile closed state) */
  hidden?: boolean
  /** Whether we're on mobile viewport (changes to overlay behavior) */
  isMobile?: boolean
  /** Callback when a navigation link is clicked (useful for mobile close) */
  onLinkClick?: () => void
  /** Additional CSS classes */
  className?: string
}

export function Sidebar({
  collapsed = false,
  hidden = false,
  isMobile = false,
  onLinkClick,
  className,
}: SidebarProps) {
  const { NAVIGATION, isActive } = useNavigation()

  // Desktop: Calculate width (hidden = 0, collapsed = 64, expanded = 256)
  const width = hidden ? 0 : collapsed ? 64 : 256

  // Mobile: Full-screen overlay with slide from left
  if (isMobile) {
    return (
      <motion.aside
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className={cn(
          'fixed left-0 top-16 bottom-0 w-3/4 z-50 flex flex-col bg-background border-t border-r overflow-hidden',
          className
        )}
      >
        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-1 p-2">
            {NAVIGATION.map((item) => {
              const active = isActive(item.href)
              const IconComponent = item.icon

              return (
                <Button
                  key={item.href}
                  variant={active ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full h-11 justify-start gap-3',
                    !active && 'text-muted-foreground'
                  )}
                  asChild
                >
                  <Link
                    href={item.href}
                    onClick={onLinkClick}
                    aria-current={active ? 'page' : undefined}
                    title={item.description}
                  >
                    <IconComponent className="h-4 w-4 flex-shrink-0" size={16} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </Button>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <div className="text-xs text-muted-foreground">
            Claims App v1.1
          </div>
        </div>
      </motion.aside>
    )
  }

  // Desktop: Width-based animation
  return (
    <motion.aside
      initial={false}
      animate={{ width }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={cn(
        'flex flex-col h-full bg-background border-t border-r overflow-hidden',
        className
      )}
    >
      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto">
        <div className={cn(
          'flex flex-col gap-1',
          collapsed ? 'p-2' : 'p-2'
        )}>
          {NAVIGATION.map((item) => {
            const active = isActive(item.href)
            const IconComponent = item.icon

            return (
              <Button
                key={item.href}
                variant={active ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full h-11',
                  collapsed ? 'justify-center px-0' : 'justify-start gap-3',
                  !active && 'text-muted-foreground'
                )}
                asChild
              >
                <Link
                  href={item.href}
                  onClick={onLinkClick}
                  aria-current={active ? 'page' : undefined}
                  title={item.description}
                >
                  <IconComponent className="h-4 w-4 flex-shrink-0" size={16} />
                  {!collapsed && (
                    <motion.span
                      initial={false}
                      animate={{ opacity: collapsed ? 0 : 1 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="truncate"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </Link>
              </Button>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className={cn(
        'p-4 border-t',
        collapsed ? 'px-2' : 'px-4'
      )}>
        {!collapsed && (
          <motion.div
            initial={false}
            animate={{ opacity: collapsed ? 0 : 1 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="text-xs text-muted-foreground"
          >
            Claims App v1.1
          </motion.div>
        )}
      </div>
    </motion.aside>
  )
}
