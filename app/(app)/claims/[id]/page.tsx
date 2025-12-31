'use client'

import React, { useState, useRef, use, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Reorder, useDragControls } from 'framer-motion'
import { toast, Toaster, ToastProvider, ToastRegistry } from '@/_barron-agency/components/Toast'
import { PlusIcon } from '@/_barron-agency/icons/PlusIcon'
import { GripVerticalIcon } from '@/_barron-agency/icons/GripVerticalIcon'
import { ItemCard } from '@/_barron-agency/components/ItemCard'
import { EditItemDialog } from '@/_barron-agency/components/EditItemDialog'
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

// Auto-scroll configuration
const SCROLL_THRESHOLD = 80  // pixels from viewport edge to start scrolling
const MAX_SCROLL_SPEED = 12  // max pixels per frame

// ReorderableItem component for drag-and-drop
interface ReorderableItemProps {
  item: ItemWithAttachments
  claimId: string
  onEdit: () => void
  onDelete: () => void
  onFilesAdded?: (files: File[]) => void
  onFileRemove?: (attachmentId: string) => void
  onDragStart?: () => void
  onDragEnd?: () => void
  constraintsRef?: React.RefObject<HTMLDivElement | null>
  isSaving?: boolean
  isResizing?: boolean
  isDragging?: boolean
  isFilesExpanded?: boolean
  onToggleFilesExpanded?: () => void
}

function ReorderableItem({
  item,
  claimId,
  onEdit,
  onDelete,
  onFilesAdded,
  onFileRemove,
  onDragStart,
  onDragEnd,
  constraintsRef,
  isSaving,
  isResizing,
  isDragging,
  isFilesExpanded,
  onToggleFilesExpanded,
}: ReorderableItemProps) {
  const dragControls = useDragControls()

  // Memoize attachments transformation to prevent infinite re-render loop
  const attachments = useMemo(() => {
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
  }, [item.attachments])

  // Content shared between both render paths
  const content = (
    <div className="flex items-start gap-2 w-full">
      {/* Drag Handle */}
      <div
        className="flex-shrink-0 py-4 px-2 -my-1 touch-none select-none cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => {
          if (!isResizing) {
            e.stopPropagation()
            dragControls.start(e)
          }
        }}
      >
        <GripVerticalIcon className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
      </div>

      {/* Item Card - display only, editing via dialog */}
      <div className="flex-1 min-w-0">
        <ItemCard
          itemId={item.id}
          title={item.title}
          description={item.description}
          onEdit={onEdit}
          onDelete={onDelete}
          attachments={attachments}
          onFilesAdded={onFilesAdded}
          onFileRemove={onFileRemove}
          isSaving={isSaving}
          isFilesExpanded={isFilesExpanded}
          onToggleFilesExpanded={onToggleFilesExpanded}
        />
      </div>
    </div>
  )

  // During resize: plain div, let CSS handle reflow naturally
  if (isResizing) {
    return (
      <div className="relative">
        {content}
      </div>
    )
  }

  // Normal: full Reorder.Item with drag-and-drop and animations
  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={dragControls}
      dragConstraints={constraintsRef}
      dragElastic={0.1}
      dragMomentum={false}
      layout={isDragging ? "position" : undefined}
      transition={{
        layout: {
          type: "spring",
          stiffness: 350,
          damping: 30,
        },
      }}
      className="relative"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {content}
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
  const [savingItemId, setSavingItemId] = useState<string | null>(null)
  const [savingClaim, setSavingClaim] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [editingItem, setEditingItem] = useState<ItemWithAttachments | null>(null)
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

  // Disable layout animations during window resize to prevent jumbling
  useEffect(() => {
    let resizeTimer: NodeJS.Timeout

    const handleResize = () => {
      setIsResizing(true)
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => setIsResizing(false), 250)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(resizeTimer)
    }
  }, [])

  // Drag state handlers
  const handleDragStart = useCallback(() => {
    setIsDragging(true)
  }, [])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Toggle item expanded state (lifted from ItemCard to survive remounts)
  const toggleItemExpanded = useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }, [])

  const items = claim?.items ?? []

  // Handle adding a new item - creates item then opens edit dialog
  const handleNewItem = async () => {
    try {
      const newItem = await createItemMutation.mutateAsync({
        claimId,
        title: '',
        description: '',
        order: 0,
      })
      // Open edit dialog for the new item
      setEditingItem(newItem)
    } catch (error) {
      toast.error('Failed to create item')
      console.error('Create error:', error)
    }
  }

  // Handle saving an item from the edit dialog
  const handleSaveItem = async (data: { title: string; description: string }) => {
    if (!editingItem) return

    // Validate that title is not empty
    if (!data.title.trim()) {
      toast.error('Title is required')
      return
    }

    setSavingItemId(editingItem.id)

    try {
      await updateItemMutation.mutateAsync({
        claimId,
        id: editingItem.id,
        ...data,
      })
      setEditingItem(null)
      toast.success('Item saved')
    } catch (error) {
      toast.error('Failed to save item')
      console.error('Save error:', error)
    } finally {
      setSavingItemId(null)
    }
  }

  // Handle deleting an item with optimistic update
  const handleDelete = async (id: string) => {
    try {
      await deleteItemMutation.mutateAsync({ claimId, id })
      stableKeysRef.current.delete(id)
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
  const handleReorder = async (newOrder: ItemWithAttachments[]) => {
    const reorderedItems = newOrder.map((item, index) => ({
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
        <div className="p-8 space-y-6">
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
        <div className="p-8 space-y-6">
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
        <div className="p-8 space-y-6">
          {/* Header with Back Link and Actions */}
          <div className="flex items-center justify-between">
            <Link
              href="/claims"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Claims
            </Link>
            <div className="flex items-center gap-2">
              <DownloadClaimPDF claimId={claimId} claimNumber={claim?.claimNumber || ''} />
              <ShareClaimButton claimId={claimId} />
            </div>
          </div>

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
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </div>
            <Button onClick={handleNewItem} className="gap-2">
              <PlusIcon className="h-4 w-4" />
              Add Item
            </Button>
          </div>

          {/* Items List */}
          <div className="flex flex-col gap-4 w-full">
            {items.length === 0 ? (
              <EmptyState
                title="No items yet"
                description="Click 'Add Item' to add items to this claim."
              />
            ) : (
              <div ref={constraintsRef}>
                <Reorder.Group
                  axis="y"
                  values={items}
                  onReorder={handleReorder}
                  className="flex flex-col gap-4 w-full touch-pan-y"
                >
                  {items.map((item) => {
                    const stableKey = stableKeysRef.current.get(item.id) || item.id

                    return (
                      <ReorderableItem
                        key={stableKey}
                        item={item}
                        claimId={claimId}
                        onEdit={() => setEditingItem(item)}
                        onDelete={() => handleDelete(item.id)}
                        onFilesAdded={(files) => handleFilesAdded(item.id, files)}
                        onFileRemove={(attachmentId) => handleFileRemove(item.id, attachmentId)}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        constraintsRef={constraintsRef}
                        isSaving={savingItemId === item.id}
                        isResizing={isResizing}
                        isDragging={isDragging}
                        isFilesExpanded={expandedItems.has(item.id)}
                        onToggleFilesExpanded={() => toggleItemExpanded(item.id)}
                      />
                    )
                  })}
                </Reorder.Group>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Item Dialog */}
      <EditItemDialog
        open={editingItem !== null}
        onOpenChange={(open) => !open && setEditingItem(null)}
        title={editingItem?.title || ''}
        description={editingItem?.description || ''}
        onSave={handleSaveItem}
      />
    </ToastProvider>
  )
}
