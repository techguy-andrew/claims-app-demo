"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Inline utility for merging Tailwind classes - makes component portable
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// DropdownMenu Context
interface DropdownMenuContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null)

function useDropdownMenuContext() {
  const context = React.useContext(DropdownMenuContext)
  if (!context) {
    throw new Error("DropdownMenu components must be used within a DropdownMenu")
  }
  return context
}

// Main DropdownMenu component
export interface DropdownMenuProps {
  children: React.ReactNode
}

function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  return (
    <DropdownMenuContext.Provider value={{ open, onOpenChange: setOpen, triggerRef }}>
      {children}
    </DropdownMenuContext.Provider>
  )
}

// DropdownMenu Trigger
export interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, DropdownMenuTriggerProps>(
  ({ asChild, children, onClick, ...props }, ref) => {
    const { open, onOpenChange, triggerRef } = useDropdownMenuContext()

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e)
      onOpenChange(!open)
    }

    // Merge refs
    const mergedRef = React.useCallback(
      (node: HTMLButtonElement | null) => {
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
        if (triggerRef) (triggerRef as React.MutableRefObject<HTMLButtonElement | null>).current = node
      },
      [ref, triggerRef]
    )

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<{ onClick?: React.MouseEventHandler; ref?: React.Ref<HTMLButtonElement> }>, {
        onClick: handleClick,
        ref: mergedRef,
      })
    }

    return (
      <button ref={mergedRef} onClick={handleClick} {...props}>
        {children}
      </button>
    )
  }
)
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

// DropdownMenu Content
export interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "center" | "end"
  sideOffset?: number
}

const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ className, align = "center", sideOffset = 4, children, onDrag, onDragStart, onDragEnd, ...props }, ref) => {
    const { open, onOpenChange, triggerRef } = useDropdownMenuContext()
    const contentRef = React.useRef<HTMLDivElement>(null)
    const [position, setPosition] = React.useState({ top: 0, left: 0 })
    const [mounted, setMounted] = React.useState(false)

    // Calculate position based on trigger element
    React.useEffect(() => {
      if (open && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        const contentWidth = contentRef.current?.offsetWidth || 0

        let left = rect.left
        if (align === "center") {
          left = rect.left + rect.width / 2 - contentWidth / 2
        } else if (align === "end") {
          left = rect.right - contentWidth
        }

        // Keep within viewport
        const maxLeft = window.innerWidth - contentWidth - 8
        left = Math.max(8, Math.min(left, maxLeft))

        setPosition({
          top: rect.bottom + sideOffset,
          left,
        })
      }
    }, [open, align, sideOffset, triggerRef])

    // Handle click outside
    React.useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          contentRef.current &&
          !contentRef.current.contains(e.target as Node) &&
          triggerRef.current &&
          !triggerRef.current.contains(e.target as Node)
        ) {
          onOpenChange(false)
        }
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onOpenChange(false)
          triggerRef.current?.focus()
        }
      }

      const handleScroll = () => {
        onOpenChange(false)
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
    }, [open, onOpenChange, triggerRef])

    // Handle mounting for portal
    React.useEffect(() => {
      setMounted(true)
    }, [])

    if (!mounted) return null

    return createPortal(
      <AnimatePresence>
        {open && (
          <motion.div
            ref={(node) => {
              if (typeof ref === "function") ref(node)
              else if (ref) ref.current = node
              contentRef.current = node
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className={cn(
              "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
              className
            )}
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
            }}
            {...props}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    )
  }
)
DropdownMenuContent.displayName = "DropdownMenuContent"

// DropdownMenu Item
export interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  inset?: boolean
}

const DropdownMenuItem = React.forwardRef<HTMLButtonElement, DropdownMenuItemProps>(
  ({ className, inset, onClick, ...props }, ref) => {
    const { onOpenChange } = useDropdownMenuContext()

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e)
      onOpenChange(false)
    }

    return (
      <button
        ref={ref}
        className={cn(
          "relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50",
          inset && "pl-8",
          className
        )}
        onClick={handleClick}
        {...props}
      />
    )
  }
)
DropdownMenuItem.displayName = "DropdownMenuItem"

// DropdownMenu Label
export interface DropdownMenuLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean
}

const DropdownMenuLabel = React.forwardRef<HTMLDivElement, DropdownMenuLabelProps>(
  ({ className, inset, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "px-2 py-2 text-sm font-semibold",
        inset && "pl-8",
        className
      )}
      {...props}
    />
  )
)
DropdownMenuLabel.displayName = "DropdownMenuLabel"

// DropdownMenu Separator
const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = "DropdownMenuSeparator"

// DropdownMenu Shortcut
const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn("ml-auto text-xs tracking-widest opacity-60", className)}
      {...props}
    />
  )
}
DropdownMenuShortcut.displayName = "DropdownMenuShortcut"

// Group - simple wrapper
const DropdownMenuGroup = ({ children }: { children: React.ReactNode }) => (
  <div role="group">{children}</div>
)

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
}
