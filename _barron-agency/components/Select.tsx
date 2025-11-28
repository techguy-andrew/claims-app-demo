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

// Checkmark icon for selected items
function CheckIcon({ className }: { className?: string }) {
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
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

// Select Context
interface SelectContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: string
  onValueChange: (value: string) => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
  disabled?: boolean
}

const SelectContext = React.createContext<SelectContextValue | null>(null)

function useSelectContext() {
  const context = React.useContext(SelectContext)
  if (!context) {
    throw new Error("Select components must be used within a Select")
  }
  return context
}

// Main Select component
export interface SelectProps {
  children: React.ReactNode
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
}

function Select({ children, value, onValueChange, disabled }: SelectProps) {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  return (
    <SelectContext.Provider
      value={{
        open,
        onOpenChange: setOpen,
        value,
        onValueChange,
        triggerRef,
        disabled,
      }}
    >
      {children}
    </SelectContext.Provider>
  )
}

// Select Trigger
export interface SelectTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, onClick, ...props }, ref) => {
    const { open, onOpenChange, triggerRef, disabled } = useSelectContext()

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return
      onClick?.(e)
      onOpenChange(!open)
    }

    // Merge refs
    const mergedRef = React.useCallback(
      (node: HTMLButtonElement | null) => {
        if (typeof ref === "function") ref(node)
        else if (ref) ref.current = node
        if (triggerRef)
          (triggerRef as React.MutableRefObject<HTMLButtonElement | null>).current = node
      },
      [ref, triggerRef]
    )

    return (
      <button
        type="button"
        ref={mergedRef}
        onClick={handleClick}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon className="opacity-50" />
      </button>
    )
  }
)
SelectTrigger.displayName = "SelectTrigger"

// Select Value - displays the selected value or placeholder
export interface SelectValueProps {
  placeholder?: string
  children?: (value: string) => React.ReactNode
}

function SelectValue({ placeholder, children }: SelectValueProps) {
  const { value } = useSelectContext()

  if (!value) {
    return <span className="text-muted-foreground">{placeholder}</span>
  }

  if (children) {
    return <span>{children(value)}</span>
  }

  return <span>{value}</span>
}
SelectValue.displayName = "SelectValue"

// Select Content
export interface SelectContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "center" | "end"
  sideOffset?: number
}

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, align = "start", sideOffset = 4, children, onDrag, onDragStart, onDragEnd, ...props }, ref) => {
    const { open, onOpenChange, triggerRef } = useSelectContext()
    const contentRef = React.useRef<HTMLDivElement>(null)
    const [position, setPosition] = React.useState({ top: 0, left: 0, width: 0 })
    const [mounted, setMounted] = React.useState(false)

    // Calculate position based on trigger element
    React.useEffect(() => {
      if (open && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        const contentWidth = rect.width // Match trigger width

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
          width: rect.width,
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
            role="listbox"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className={cn(
              "z-50 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
              className
            )}
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              minWidth: position.width,
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
SelectContent.displayName = "SelectContent"

// Select Item
export interface SelectItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

const SelectItem = React.forwardRef<HTMLButtonElement, SelectItemProps>(
  ({ className, value, children, onClick, ...props }, ref) => {
    const { value: selectedValue, onValueChange, onOpenChange } = useSelectContext()
    const isSelected = selectedValue === value

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e)
      onValueChange(value)
      onOpenChange(false)
    }

    return (
      <button
        type="button"
        ref={ref}
        role="option"
        aria-selected={isSelected}
        className={cn(
          "relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50",
          isSelected && "bg-accent/50",
          className
        )}
        onClick={handleClick}
        {...props}
      >
        <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
          {isSelected && <CheckIcon />}
        </span>
        {children}
      </button>
    )
  }
)
SelectItem.displayName = "SelectItem"

// Select Group - for grouping items
function SelectGroup({ children }: { children: React.ReactNode }) {
  return <div role="group">{children}</div>
}
SelectGroup.displayName = "SelectGroup"

// Select Label - for group labels
export interface SelectLabelProps extends React.HTMLAttributes<HTMLDivElement> {}

const SelectLabel = React.forwardRef<HTMLDivElement, SelectLabelProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)}
      {...props}
    />
  )
)
SelectLabel.displayName = "SelectLabel"

// Select Separator
const SelectSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
SelectSeparator.displayName = "SelectSeparator"

export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
}
