'use client'

import React, { useState, useRef, use, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Reorder, useDragControls, AnimatePresence, LayoutGroup } from 'framer-motion'
import { toast, Toaster, ToastProvider, ToastRegistry } from '@/_barron-agency/components/Toast'
import { PlusIcon } from '@/_barron-agency/icons/PlusIcon'
import { GripVerticalIcon } from '@/_barron-agency/icons/GripVerticalIcon'
import { ItemCard } from '@/_barron-agency/components/ItemCard'
import { ClaimDetailsCard, type ClaimDetailsData } from '@/_barron-agency/components/ClaimDetailsCard'
import { Button } from '@/_barron-agency/components/Button'
import { DownloadClaimPDF } from '@/_barron-agency/components/DownloadClaimPDF'
import { ShareClaimButton } from '@/_barron-agency/components/ShareClaimButton'
import { EmptyState } from '@/_barron-agency/components/EmptyState'
import { Card, CardContent } from '@/_barron-agency/components/Card'
import { Skeleton } from '@/_barron-agency/components/Skeleton'
import { useClaim, useUpdateClaim, useDeleteClaim } from '@/lib/hooks/useClaims'
import {
  useCreateItem,
  useUpdateItem,
  useDeleteItem,
  useReorderItems,
  type ItemWithAttachments,
} from '@/lib/hooks/useItems'
import { useAddAttachments, useRemoveAttachment } from '@/lib/hooks/useAttachments'

// Draft item type that can be mixed with real items
interface DraftItem {
  id: string
  title: string
  description: string
  order: number
  claimId: string
  createdAt: Date
  updatedAt: Date
  attachments: []
  isDraft: true
}

// Combined type for items array (real items + draft)
type DisplayItem = ItemWithAttachments | DraftItem

function isDraftItem(item: DisplayItem): item is DraftItem {
  return 'isDraft' in item && item.isDraft === true
}

// Auto-scroll configuration
const SCROLL_THRESHOLD = 80  // pixels from viewport edge to start scrolling
const MAX_SCROLL_SPEED = 12  // max pixels per frame

// ReorderableItem component for drag-and-drop - handles both draft and real items
interface ReorderableItemProps {
  item: DisplayItem
  claimId: string
  editingItemId: string | null
  onEdit: (id: string) => void
  onSave: (id: string, data: { title: string; description: string }) => void
  onCancel: (id: string) => void
  onDelete: (id: string) => void
  onFilesAdded?: (itemId: string, files: File[]) => void
  onFileRemove?: (itemId: string, attachmentId: string) => void
  onDragStart?: () => void
  onDragEnd?: () => void
  constraintsRef?: React.RefObject<HTMLDivElement | null>
  autoFocus?: boolean
  isSaving?: boolean
}

function ReorderableItem({
  item,
  claimId,
  editingItemId,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onFilesAdded,
  onFileRemove,
  onDragStart,
  onDragEnd,
  constraintsRef,
  autoFocus,
  isSaving,
}: ReorderableItemProps) {
  const dragControls = useDragControls()
  const isEditing = editingItemId === item.id
  const itemIsDraft = isDraftItem(item)

  // Memoize attachments transformation to prevent infinite re-render loop
  // Draft items have empty attachments array
  const attachments = useMemo(() => {
    if (itemIsDraft) return []
    return item.attachments.map((a) => ({
      id: a.id,
      name: a.filename,
      url: a.url,
      thumbnailUrl: a.thumbnailUrl,
      type: a.mimeType,
      size: a.size,
      width: a.width,
      height: a.height,
      publicId: a.publicId,
      format: a.format,
    }))
  }, [item, itemIsDraft])

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={dragControls}
      dragConstraints={constraintsRef}
      dragElastic={0.1}
      dragMomentum={false}
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        layout: {
          type: "spring",
          stiffness: 300,
          damping: 35,
          mass: 0.8,
        },
        opacity: { duration: 0.2 }
      }}
      className="relative"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-start gap-2 w-full">
        {/* Drag Handle - disabled for draft items */}
        <div
          className={`flex-shrink-0 pt-6 ${itemIsDraft ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`}
          onPointerDown={(e) => {
            if (!isEditing && !itemIsDraft) {
              dragControls.start(e)
            }
          }}
        >
          <GripVerticalIcon className={`h-5 w-5 ${itemIsDraft ? 'text-muted-foreground/30' : 'text-muted-foreground hover:text-foreground'} transition-colors`} />
        </div>

        {/* Item Card */}
        <div className="flex-1 min-w-0">
          <ItemCard
            itemId={itemIsDraft ? undefined : item.id}
            title={item.title}
            description={item.description}
            editable={true}
            onEdit={() => onEdit(item.id)}
            onSave={(data) => onSave(item.id, data)}
            onCancel={() => onCancel(item.id)}
            onDelete={itemIsDraft ? undefined : () => onDelete(item.id)}
            autoFocus={autoFocus}
            attachments={attachments}
            onFilesAdded={itemIsDraft ? undefined : (files) => onFilesAdded?.(item.id, files)}
            onFileRemove={itemIsDraft ? undefined : (attachmentId) => onFileRemove?.(item.id, attachmentId)}
            isSaving={isSaving}
            titlePlaceholder="Enter item title..."
            descriptionPlaceholder="Enter item description..."
          />
        </div>
      </div>
    </Reorder.Item>
  )
}

export default function ClaimDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const { id: claimId } = use(params)
  const { data: claim, isLoading, error } = useClaim(claimId)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [savingItemId, setSavingItemId] = useState<string | null>(null)
  const [savingClaim, setSavingClaim] = useState(false)
  const [draftItem, setDraftItem] = useState<DraftItem | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const stableKeysRef = useRef<Map<string, string>>(new Map())
  const pointerYRef = useRef(0)
  const animationFrameRef = useRef<number | null>(null)
  const constraintsRef = useRef<HTMLDivElement>(null)

  // React Query mutations
  const createItemMutation = useCreateItem()
  const updateItemMutation = useUpdateItem()
  const deleteItemMutation = useDeleteItem()
  const reorderItemsMutation = useReorderItems()
  const updateClaimMutation = useUpdateClaim()
  const deleteClaimMutation = useDeleteClaim()
  const addAttachmentsMutation = useAddAttachments()
  const removeAttachmentMutation = useRemoveAttachment()

  // Auto-scroll effect when dragging near viewport edges
  useEffect(() => {
    if (!isDragging) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      return
    }

    const handlePointerMove = (e: PointerEvent) => {
      pointerYRef.current = e.clientY
    }

    const scrollLoop = () => {
      const viewportHeight = window.innerHeight
      const pointerY = pointerYRef.current

      // Near top edge - scroll up
      if (pointerY > 0 && pointerY < SCROLL_THRESHOLD) {
        const speed = ((SCROLL_THRESHOLD - pointerY) / SCROLL_THRESHOLD) * MAX_SCROLL_SPEED
        window.scrollBy(0, -speed)
      }
      // Near bottom edge - scroll down
      else if (pointerY > viewportHeight - SCROLL_THRESHOLD && pointerY < viewportHeight) {
        const speed = ((pointerY - (viewportHeight - SCROLL_THRESHOLD)) / SCROLL_THRESHOLD) * MAX_SCROLL_SPEED
        window.scrollBy(0, speed)
      }

      animationFrameRef.current = requestAnimationFrame(scrollLoop)
    }

    document.addEventListener('pointermove', handlePointerMove)
    animationFrameRef.current = requestAnimationFrame(scrollLoop)

    return () => {
      document.removeEventListener('pointermove', handlePointerMove)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [isDragging])

  // Drag state handlers
  const handleDragStart = useCallback(() => {
    setIsDragging(true)
  }, [])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Combine draft item with real items into a single array for unified rendering
  const realItems = claim?.items ?? []
  const displayItems: DisplayItem[] = useMemo(() => {
    if (draftItem) {
      return [draftItem, ...realItems]
    }
    return realItems
  }, [draftItem, realItems])

  // Handle adding a new item - creates a local draft at the top of the list
  const handleNewItem = () => {
    // Don't allow creating another draft if one exists
    if (draftItem) return

    const draftId = `draft-${Date.now()}`
    const newDraft: DraftItem = {
      id: draftId,
      title: '',
      description: '',
      order: -1, // Place at top
      claimId,
      createdAt: new Date(),
      updatedAt: new Date(),
      attachments: [],
      isDraft: true,
    }
    setDraftItem(newDraft)
    setEditingItemId(draftId)
  }

  // Handle editing an item
  const handleEdit = (id: string) => {
    setEditingItemId(id)
  }

  // Handle saving an item with optimistic update
  const handleSave = async (id: string, data: { title: string; description: string }) => {
    // Validate that title is not empty
    if (!data.title.trim()) {
      toast.error('Title is required')
      return
    }

    setSavingItemId(id)

    // Check if this is a draft item (new item not yet in DB)
    if (draftItem && draftItem.id === id) {
      try {
        // Update the draft item's content optimistically while saving
        // This keeps the content visible during the save
        setDraftItem({
          ...draftItem,
          title: data.title,
          description: data.description,
        })

        await createItemMutation.mutateAsync({
          claimId,
          title: data.title,
          description: data.description,
          order: 0,
        })

        // Clear the draft - the real item now exists in the cache
        setDraftItem(null)
        setEditingItemId(null)
        toast.success('Item created')
      } catch (error) {
        toast.error('Failed to create item')
        console.error('Create error:', error)
      } finally {
        setSavingItemId(null)
      }
      return
    }

    // Existing item - update it
    try {
      await updateItemMutation.mutateAsync({
        claimId,
        id,
        ...data,
      })
      setEditingItemId(null)
      toast.success('Item saved')
    } catch (error) {
      toast.error('Failed to save item')
      console.error('Save error:', error)
    } finally {
      setSavingItemId(null)
    }
  }

  // Handle canceling edit
  const handleCancel = (id: string) => {
    // If it's a draft item, just remove it locally (no DB call needed)
    if (draftItem && draftItem.id === id) {
      setDraftItem(null)
      setEditingItemId(null)
      return
    }

    setEditingItemId(null)
  }

  // Handle deleting an item with optimistic update
  const handleDelete = async (id: string) => {
    try {
      await deleteItemMutation.mutateAsync({ claimId, id })
      stableKeysRef.current.delete(id)

      if (editingItemId === id) {
        setEditingItemId(null)
      }

      toast.success('Item deleted')
    } catch (error) {
      toast.error('Failed to delete item')
      console.error('Delete error:', error)
    }
  }

  // Handle saving claim details
  const handleSaveClaimDetails = async (data: Partial<ClaimDetailsData>) => {
    setSavingClaim(true)
    try {
      await updateClaimMutation.mutateAsync({
        id: claimId,
        ...data,
      })
      toast.success('Claim details saved')
    } catch (error) {
      toast.error('Failed to save claim details')
      console.error('Save claim error:', error)
    } finally {
      setSavingClaim(false)
    }
  }

  // Handle deleting the claim
  const handleDeleteClaim = async () => {
    try {
      await deleteClaimMutation.mutateAsync({ id: claimId })
      toast.success('Claim deleted')
      router.push('/claims')
    } catch (error) {
      toast.error('Failed to delete claim')
      console.error('Delete claim error:', error)
    }
  }

  // Handle adding files to an item
  const handleFilesAdded = async (itemId: string, files: File[]) => {
    try {
      await addAttachmentsMutation.mutateAsync({
        claimId,
        itemId,
        files,
      })
      toast.success(`${files.length} file${files.length > 1 ? 's' : ''} uploaded`)
    } catch (error) {
      toast.error('Failed to upload files')
      console.error('Upload error:', error)
    }
  }

  // Handle removing a file from an item
  const handleFileRemove = async (itemId: string, attachmentId: string) => {
    try {
      await removeAttachmentMutation.mutateAsync({
        claimId,
        itemId,
        attachmentId,
      })
      toast.success('File deleted')
    } catch (error) {
      toast.error('Failed to delete file')
      console.error('Delete file error:', error)
    }
  }

  // Handle reordering items with optimistic update
  // Only reorder real items, not draft items
  const handleReorder = async (newOrder: DisplayItem[]) => {
    // Filter out draft items - they shouldn't be reordered
    const realItemsOnly = newOrder.filter((item): item is ItemWithAttachments => !isDraftItem(item))

    const reorderedItems = realItemsOnly.map((item, index) => ({
      id: item.id,
      order: index,
    }))

    if (reorderedItems.length === 0) return

    try {
      await reorderItemsMutation.mutateAsync({
        claimId,
        items: reorderedItems,
      })
    } catch (error) {
      toast.error('Failed to update order')
      console.error('Reorder error:', error)
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-[1200px] w-full mx-auto px-6 py-4 space-y-6">
          <EmptyState
            title="Claim Not Found"
            description="The claim could not be found or there was an error loading it."
          />
          <Link href="/claims">
            <Button variant="outline">Back to Claims</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-[1200px] w-full mx-auto px-6 py-4 space-y-6">
          <Skeleton className="h-10 w-1/2" />
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <ToastProvider>
      <ToastRegistry />
      <Toaster />
      <div className="min-h-screen bg-background">
        <div className="max-w-[1200px] w-full mx-auto px-6 py-4 space-y-6">
          {/* Back Link */}
          <Link
            href="/claims"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Claims
          </Link>

          {/* Claim Info Card */}
          {claim && (
            <ClaimDetailsCard
              claim={{
                claimNumber: claim.claimNumber,
                status: claim.status,
                customer: claim.customer,
                adjustorName: claim.adjustorName,
                adjustorPhone: claim.adjustorPhone,
                adjustorEmail: claim.adjustorEmail,
                claimantName: claim.claimantName,
                claimantPhone: claim.claimantPhone,
                claimantEmail: claim.claimantEmail,
                claimantAddress: claim.claimantAddress,
              }}
              onSave={handleSaveClaimDetails}
              onDelete={handleDeleteClaim}
              isSaving={savingClaim}
            />
          )}

          {/* Actions Bar */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="text-sm text-muted-foreground">
              {realItems.length} {realItems.length === 1 ? 'item' : 'items'}
            </div>
            <div className="flex items-center gap-2">
              <DownloadClaimPDF claimId={claimId} claimNumber={claim?.claimNumber || ''} />
              <ShareClaimButton claimId={claimId} />
              <Button onClick={handleNewItem} className="gap-2" disabled={!!draftItem}>
                <PlusIcon className="h-4 w-4" />
                Add Item
              </Button>
            </div>
          </div>

          {/* Items List - unified rendering for both draft and real items */}
          <div className="flex flex-col gap-4 w-full">
            {displayItems.length === 0 ? (
              <EmptyState
                title="No items yet"
                description="Click 'Add Item' to add items to this claim."
              />
            ) : (
              <LayoutGroup>
                <div ref={constraintsRef}>
                  <AnimatePresence mode="popLayout">
                    <Reorder.Group
                      axis="y"
                      values={displayItems}
                      onReorder={handleReorder}
                      className="flex flex-col gap-4 w-full touch-pan-y select-none"
                    >
                      {displayItems.map((item) => {
                        const stableKey = stableKeysRef.current.get(item.id) || item.id

                        return (
                          <ReorderableItem
                            key={stableKey}
                            item={item}
                            claimId={claimId}
                            editingItemId={editingItemId}
                            onEdit={handleEdit}
                            onSave={handleSave}
                            onCancel={handleCancel}
                            onDelete={handleDelete}
                            onFilesAdded={handleFilesAdded}
                            onFileRemove={handleFileRemove}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            constraintsRef={constraintsRef}
                            autoFocus={editingItemId === item.id}
                            isSaving={savingItemId === item.id}
                          />
                        )
                      })}
                    </Reorder.Group>
                  </AnimatePresence>
                </div>
              </LayoutGroup>
            )}
          </div>
        </div>
      </div>
    </ToastProvider>
  )
}
