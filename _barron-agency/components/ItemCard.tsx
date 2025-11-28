'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { MenuIcon } from '../icons/MenuIcon'
import { LoadingIcon } from '../icons/LoadingIcon'
import { SaveIcon } from '../icons/SaveIcon'
import { CancelIcon } from '../icons/CancelIcon'
import { GripVerticalIcon } from '../icons/GripVerticalIcon'
import { ChevronRightIcon } from '../icons/ChevronRightIcon'
import { FileGallery } from './FileGallery'
import { ConfirmationDialog } from './ConfirmationDialog'
import type { Attachment } from '../types'
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Inline utility for merging Tailwind classes - makes component portable
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Props for the ItemCard component.
 *
 * ItemCard is a smart component that handles inline editing, file attachments,
 * and drag-and-drop reordering. It's designed for optimistic UI patterns where
 * changes feel instant while syncing in the background.
 */
export interface ItemCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Unique identifier for the item, used for file attachment management */
  itemId?: string
  /** Display title of the item (null/undefined shows 'N/A' in view mode) */
  title?: string | null
  /** Long-form description text (null/undefined shows 'N/A' in view mode) */
  description?: string | null
  /** Enable inline editing mode with double-click to edit */
  editable?: boolean
  /**
   * Callback when user saves title/description edits.
   * Called with the new values after user clicks save or presses Enter.
   */
  onSave?: (data: { title: string; description: string }) => void
  /** Callback when user clicks Edit in the dropdown menu */
  onEdit?: () => void
  /** Callback when user clicks Delete in the dropdown menu */
  onDelete?: () => void
  /** Callback when user clicks Duplicate in the dropdown menu */
  onDuplicate?: () => void
  /**
   * Callback when user cancels editing.
   * For new empty items, this removes the item immediately.
   * For existing items, prompts to confirm discarding changes.
   */
  onCancel?: () => void
  /**
   * Drag handle props from drag-and-drop library.
   * Spread these onto the grip icon element to enable dragging.
   */
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
  /** Whether this card is currently being dragged (adds shadow effect) */
  isDragging?: boolean
  /** Auto-focus the title field on mount (for newly created items) */
  autoFocus?: boolean
  /** Placeholder text shown in empty title field during editing */
  titlePlaceholder?: string
  /** Placeholder text shown in empty description field during editing */
  descriptionPlaceholder?: string
  /** Array of file attachments to display in the expandable file grid */
  attachments?: Attachment[]
  /** Callback when user adds files (not currently wired to UI in this component) */
  onFilesAdded?: (files: File[]) => void
  /**
   * Callback when user removes an attachment.
   * Called with the attachment ID to remove.
   */
  onFileRemove?: (attachmentId: string) => void
  /**
   * Visual indicator for background save operations.
   * Shows loading spinner instead of menu icon when true.
   */
  isSaving?: boolean
}

export function ItemCard({
  itemId,
  title: initialTitle,
  description: initialDescription,
  className,
  children,
  editable = false,
  onSave,
  onEdit,
  onDelete,
  onDuplicate,
  onCancel,
  dragHandleProps,
  isDragging = false,
  autoFocus = false,
  titlePlaceholder = 'Item title',
  descriptionPlaceholder = 'Item description',
  attachments: initialAttachments = [],
  onFilesAdded,
  onFileRemove,
  isSaving = false,
  ...props
}: ItemCardProps) {
  // Handle null/undefined values with proper defaults
  const safeTitle = initialTitle || ''
  const safeDescription = initialDescription || ''
  const [isEditing, setIsEditing] = React.useState(autoFocus)
  const [tempTitle, setTempTitle] = React.useState(safeTitle)
  const [tempDescription, setTempDescription] = React.useState(safeDescription)
  const [originalTitle, setOriginalTitle] = React.useState(safeTitle)
  const [originalDescription, setOriginalDescription] = React.useState(safeDescription)
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [attachments, setAttachments] = React.useState<Attachment[]>(initialAttachments)
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = React.useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)
  const titleRef = React.useRef<HTMLDivElement>(null)
  const descriptionRef = React.useRef<HTMLDivElement>(null)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const menuTriggerRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    setTempTitle(safeTitle)
    setTempDescription(safeDescription)
    setOriginalTitle(safeTitle)
    setOriginalDescription(safeDescription)
  }, [safeTitle, safeDescription])

  // Use JSON comparison to avoid infinite loops from array reference changes
  const attachmentsKey = JSON.stringify(initialAttachments.map(a => a.id))
  React.useEffect(() => {
    setAttachments(initialAttachments)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachmentsKey])

  // Auto-focus title ONLY on initial mount when autoFocus is true (for new items)
  React.useEffect(() => {
    if (autoFocus && titleRef.current) {
      setTimeout(() => {
        titleRef.current?.focus()
      }, 50)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run only once on mount

  // Handle click outside for dropdown menu
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        menuTriggerRef.current &&
        !menuTriggerRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && menuOpen) {
        setMenuOpen(false)
        menuTriggerRef.current?.focus()
      }
    }

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  const handleEdit = () => {
    setIsEditing(true)
    setOriginalTitle(titleRef.current?.textContent || safeTitle)
    setOriginalDescription(descriptionRef.current?.textContent || safeDescription)
    onEdit?.()
  }

  const handleSave = () => {
    if (titleRef.current && descriptionRef.current) {
      const newTitle = titleRef.current.textContent || ''
      const newDescription = descriptionRef.current.textContent || ''
      onSave?.({ title: newTitle, description: newDescription })
      setTempTitle(newTitle)
      setTempDescription(newDescription)
      // Clear cursor position memory
      titleRef.current.blur()
      descriptionRef.current.blur()
    }
    setIsEditing(false)
  }

  const checkForChanges = () => {
    const currentTitle = titleRef.current?.textContent || ''
    const currentDescription = descriptionRef.current?.textContent || ''
    return currentTitle !== originalTitle || currentDescription !== originalDescription
  }

  const handleCancel = () => {
    // Check current content in the editable fields
    const currentTitle = titleRef.current?.textContent || ''
    const currentDescription = descriptionRef.current?.textContent || ''

    // For new items (no initial content), check if user has typed anything
    if (!safeTitle && !safeDescription) {
      // If user typed something, show confirmation
      if (currentTitle.trim() || currentDescription.trim()) {
        setShowCancelConfirm(true)
        return
      }
      // No content typed, remove immediately without confirmation
      onCancel?.()
      return
    }

    // For existing items, check if there are unsaved changes
    if (checkForChanges()) {
      setShowCancelConfirm(true)
      return
    }

    // No changes, just cancel
    performCancel()
  }

  const performCancel = () => {
    // Restore original content
    if (titleRef.current && descriptionRef.current) {
      titleRef.current.textContent = originalTitle
      descriptionRef.current.textContent = originalDescription
      titleRef.current.blur()
      descriptionRef.current.blur()
    }
    setIsEditing(false)
    onCancel?.()
  }

  const handleConfirmCancel = () => {
    setShowCancelConfirm(false)
    performCancel()
  }

  const handleDeleteClick = () => {
    setMenuOpen(false)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = () => {
    setShowDeleteConfirm(false)
    onDelete?.()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (isEditing) {
        handleSave()
      }
    }
    if (e.key === 'Escape' && isEditing) {
      e.preventDefault()
      handleCancel()
    }
  }

  const handleMenuItemClick = (action: () => void) => {
    setMenuOpen(false)
    action()
  }

  return (
    <div
      className={cn(
        'rounded-lg border bg-card text-card-foreground shadow-sm w-full h-full transition-shadow',
        isDragging && 'shadow-lg',
        className
      )}
      {...props}
    >
      {/* Card Header */}
      <div className="flex flex-col gap-2 p-4 sm:p-6 relative">
        <div className={cn(
          "grid gap-4 sm:gap-6 items-start w-full",
          dragHandleProps ? "grid-cols-[auto,1fr]" : "grid-cols-[1fr]"
        )}>
          {dragHandleProps && (
            <div
              {...dragHandleProps}
              onContextMenu={(e) => e.preventDefault()}
              className={cn(
                "cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors pt-1 select-none touch-none",
                dragHandleProps.className
              )}
            >
              <GripVerticalIcon className="h-5 w-5" />
            </div>
          )}

          <div className={cn(
            "flex flex-col gap-2 sm:gap-3 min-w-0 flex-1 select-none cursor-default"
          )}
            onDoubleClick={() => editable && !isEditing && handleEdit()}
          >
            {/* Title */}
            <div
              ref={titleRef}
              contentEditable={isEditing}
              suppressContentEditableWarning
              onKeyDown={handleKeyDown}
              data-placeholder={isEditing ? titlePlaceholder : undefined}
              className={cn(
                "text-2xl font-semibold leading-none tracking-tight outline-none",
                "min-h-[1.75rem]",
                "leading-7",
                "text-base sm:text-lg lg:text-xl",
                "break-words w-full",
                isEditing ? "cursor-text" : "select-text",
                isEditing && "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50",
                !safeTitle && !isEditing && "text-muted-foreground italic"
              )}
            >
              {safeTitle || (isEditing ? '' : 'N/A')}
            </div>

            {/* Description */}
            <div
              ref={descriptionRef}
              contentEditable={isEditing}
              suppressContentEditableWarning
              onKeyDown={handleKeyDown}
              data-placeholder={isEditing ? descriptionPlaceholder : undefined}
              className={cn(
                "text-sm text-muted-foreground outline-none",
                "min-h-[1.25rem]",
                "leading-5",
                "text-sm sm:text-base",
                "break-words w-full",
                isEditing ? "cursor-text" : "select-text",
                isEditing && "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50",
                !safeDescription && !isEditing && "text-muted-foreground italic"
              )}
            >
              {safeDescription || (isEditing ? '' : 'N/A')}
            </div>
          </div>
        </div>

        {/* Menu button - absolutely positioned in top right corner */}
        {(editable || onEdit || onDelete || onDuplicate) && (
          <div className="absolute top-2 right-2 sm:top-4 sm:right-4 w-[150px] flex justify-end">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <button
                  className="p-0 m-0 border-0 bg-transparent cursor-pointer outline-none focus:outline-none text-success hover:text-success/80 hover:opacity-80 transition-opacity"
                  onClick={handleSave}
                  aria-label="Save changes"
                >
                  <SaveIcon className="h-8 w-8" />
                </button>

                <button
                  className="p-0 m-0 border-0 bg-transparent cursor-pointer outline-none focus:outline-none text-destructive hover:text-destructive/80 hover:opacity-80 transition-opacity"
                  onClick={handleCancel}
                  aria-label="Cancel changes"
                >
                  <CancelIcon className="h-8 w-8" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <button
                  ref={menuTriggerRef}
                  className="p-0 m-0 border-0 bg-transparent cursor-pointer outline-none focus:outline-none hover:opacity-80 transition-opacity"
                  onClick={() => setMenuOpen(!menuOpen)}
                  aria-label="More options"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    >
                      <LoadingIcon className="h-8 w-8" />
                    </motion.div>
                  ) : (
                    <MenuIcon className="h-8 w-8" />
                  )}
                </button>

                {/* Inline Dropdown Menu */}
                {menuOpen && (
                  <div
                    ref={menuRef}
                    className="absolute right-0 top-full mt-1 z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                  >
                    {(editable || onEdit) && (
                      <button
                        className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        onClick={() => handleMenuItemClick(editable ? handleEdit : onEdit!)}
                      >
                        Edit
                      </button>
                    )}

                    {onDuplicate && (
                      <button
                        className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        onClick={() => handleMenuItemClick(onDuplicate)}
                      >
                        Duplicate
                      </button>
                    )}

                    {onDelete && (
                      <button
                        className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground text-destructive"
                        onClick={handleDeleteClick}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* File count badge and accordion toggle - always visible for visual consistency */}
      <div className="px-4 sm:px-6 pb-4">
        <button
          onClick={() => itemId && setIsExpanded(!isExpanded)}
          className={cn(
            "text-muted-foreground",
            itemId ? "cursor-pointer" : "opacity-50 cursor-not-allowed"
          )}
          disabled={!itemId}
        >
          <span className="border border-border rounded-sm px-2 py-0.5 text-sm sm:text-base flex items-center gap-1">
            <ChevronRightIcon
              className={cn(
                "h-5 w-5 transition-transform duration-200",
                isExpanded && itemId ? "rotate-90" : "rotate-0"
              )}
            />
            Files ({attachments.length})
          </span>
        </button>
      </div>

      {/* File Gallery (when expanded) or children */}
      {((itemId && isExpanded) || children) && (
        <div className="p-4 sm:p-6 pt-0 w-full">
          {itemId && isExpanded && (
            <FileGallery
              attachments={attachments}
              onFilesAdded={onFilesAdded}
              onFileRemove={onFileRemove}
              editable={editable}
              maxFiles={10}
            />
          )}
          {children}
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <ConfirmationDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        title="Discard Changes?"
        description="You have unsaved changes that will be lost. Are you sure you want to discard them?"
        onConfirm={handleConfirmCancel}
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
        isDestructive={true}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Item?"
        description="This action cannot be undone. Are you sure you want to delete this item?"
        onConfirm={handleConfirmDelete}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDestructive={true}
        confirmationText="delete this item"
      />
    </div>
  )
}

export function ItemCardGrid({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function ItemCardStack({
  children,
  className,
  direction = 'vertical',
  spacing = 'normal',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  direction?: 'vertical' | 'horizontal'
  spacing?: 'tight' | 'normal' | 'loose'
}) {
  const spacingClasses = {
    tight: 'gap-2',
    normal: 'gap-4',
    loose: 'gap-6',
  }

  return (
    <div
      className={cn(
        'flex w-full',
        direction === 'vertical' ? 'flex-col' : 'flex-row',
        spacingClasses[spacing],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
